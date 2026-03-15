package model

import (
	"time"

	"github.com/LeoMengTCM/nox-api/common"
	"gorm.io/gorm"
)

// CasinoAchievement 赌场成就定义
type CasinoAchievement struct {
	Id          int    `json:"id" gorm:"primaryKey;autoIncrement"`
	Key         string `json:"key" gorm:"type:varchar(50);uniqueIndex"`
	Name        string `json:"name" gorm:"type:varchar(100);not null"`
	Description string `json:"description" gorm:"type:varchar(255)"`
	Icon        string `json:"icon" gorm:"type:varchar(50)"`
	Category    string `json:"category" gorm:"type:varchar(30)"`
	Condition   string `json:"condition" gorm:"type:text"`
	RewardType  string `json:"reward_type" gorm:"type:varchar(20)"`
	RewardValue string `json:"reward_value" gorm:"type:varchar(100)"`
	SortOrder   int    `json:"sort_order" gorm:"default:0"`
	Enabled     bool   `json:"enabled" gorm:"default:true"`
	CreatedAt   int64  `json:"created_at" gorm:"bigint"`
}

func (CasinoAchievement) TableName() string {
	return "casino_achievements"
}

// CasinoUserAchievement 用户成就进度
type CasinoUserAchievement struct {
	Id            int    `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId        int    `json:"user_id" gorm:"not null;uniqueIndex:idx_casino_ua_user_ach"`
	AchievementId int    `json:"achievement_id" gorm:"not null;uniqueIndex:idx_casino_ua_user_ach"`
	Progress      int    `json:"progress" gorm:"default:0"`
	Completed     bool   `json:"completed" gorm:"default:false"`
	ClaimedAt     *int64 `json:"claimed_at,omitempty" gorm:"bigint"`
	CreatedAt     int64  `json:"created_at" gorm:"bigint"`
	UpdatedAt     int64  `json:"updated_at" gorm:"bigint"`
}

func (CasinoUserAchievement) TableName() string {
	return "casino_user_achievements"
}

// CasinoBigWin 大赢记录（用于跑马灯展示）
type CasinoBigWin struct {
	Id         int     `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId     int     `json:"user_id" gorm:"not null;index:idx_casino_bigwin_user"`
	Username   string  `json:"username" gorm:"type:varchar(50)"`
	GameType   string  `json:"game_type" gorm:"type:varchar(20)"`
	BetAmount  float64 `json:"bet_amount"`
	Payout     float64 `json:"payout"`
	Multiplier float64 `json:"multiplier"`
	CreatedAt  int64   `json:"created_at" gorm:"bigint;index:idx_casino_bigwin_time"`
}

func (CasinoBigWin) TableName() string {
	return "casino_big_wins"
}

// ==================== CasinoAchievement CRUD ====================

func GetAllEnabledAchievements() ([]CasinoAchievement, error) {
	var achievements []CasinoAchievement
	err := DB.Where("enabled = ?", commonTrueVal).Order("sort_order asc, id asc").Find(&achievements).Error
	return achievements, err
}

func GetAchievementById(id int) (*CasinoAchievement, error) {
	var ach CasinoAchievement
	err := DB.First(&ach, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &ach, nil
}

// ==================== CasinoUserAchievement CRUD ====================

func GetUserAchievements(userId int) ([]CasinoUserAchievement, error) {
	var records []CasinoUserAchievement
	err := DB.Where("user_id = ?", userId).Find(&records).Error
	return records, err
}

func GetUserAchievement(userId int, achievementId int) (*CasinoUserAchievement, error) {
	var record CasinoUserAchievement
	err := DB.Where("user_id = ? AND achievement_id = ?", userId, achievementId).First(&record).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &record, nil
}

func CreateUserAchievement(record *CasinoUserAchievement) error {
	now := time.Now().Unix()
	record.CreatedAt = now
	record.UpdatedAt = now
	return DB.Create(record).Error
}

func UpdateUserAchievement(record *CasinoUserAchievement) error {
	record.UpdatedAt = time.Now().Unix()
	return DB.Save(record).Error
}

// AtomicClaimAchievement 原子性领取成就奖励（防止竞态条件下重复领取）
// 仅当 claimed_at IS NULL 时更新，返回是否成功领取
func AtomicClaimAchievement(userId int, achievementId int) (bool, error) {
	now := time.Now().Unix()
	result := DB.Model(&CasinoUserAchievement{}).
		Where("user_id = ? AND achievement_id = ? AND completed = ? AND claimed_at IS NULL",
			userId, achievementId, commonTrueVal).
		Updates(map[string]interface{}{
			"claimed_at": now,
			"updated_at": now,
		})
	if result.Error != nil {
		return false, result.Error
	}
	return result.RowsAffected > 0, nil
}

// ==================== CasinoBigWin CRUD ====================

func CreateBigWin(record *CasinoBigWin) error {
	record.CreatedAt = time.Now().Unix()
	return DB.Create(record).Error
}

func GetRecentBigWins(limit int) ([]CasinoBigWin, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	var records []CasinoBigWin
	err := DB.Order("created_at desc").Limit(limit).Find(&records).Error
	return records, err
}

// ==================== Win Streak Query ====================

func GetCurrentWinStreak(userId int) (int, error) {
	var records []CasinoGameRecord
	err := DB.Where("user_id = ? AND status = ?", userId, "completed").
		Order("completed_at desc").
		Limit(100).
		Find(&records).Error
	if err != nil {
		return 0, err
	}

	streak := 0
	for _, r := range records {
		if r.Result == "win" || r.Result == "blackjack" {
			streak++
		} else {
			break
		}
	}
	return streak, nil
}

// ==================== Seed Default Achievements ====================

func SeedDefaultAchievements() {
	var count int64
	DB.Model(&CasinoAchievement{}).Count(&count)
	if count > 0 {
		return
	}

	now := time.Now().Unix()
	achievements := []CasinoAchievement{
		{
			Key: "first_bet", Name: "初入魔法赌坊", Description: "首次下注",
			Icon: "wand", Category: "milestone",
			Condition: `{"type":"first_bet","value":1}`,
			RewardType: "quota", RewardValue: "5000",
			SortOrder: 1, Enabled: true, CreatedAt: now,
		},
		{
			Key: "win_streak_3", Name: "幸运三连", Description: "连胜3局",
			Icon: "clover", Category: "streak",
			Condition: `{"type":"win_streak","value":3}`,
			RewardType: "quota", RewardValue: "10000",
			SortOrder: 2, Enabled: true, CreatedAt: now,
		},
		{
			Key: "win_streak_5", Name: "幸运星", Description: "连胜5局",
			Icon: "star", Category: "streak",
			Condition: `{"type":"win_streak","value":5}`,
			RewardType: "quota", RewardValue: "25000",
			SortOrder: 3, Enabled: true, CreatedAt: now,
		},
		{
			Key: "total_profit_100k", Name: "小有所获", Description: "累计盈利100000",
			Icon: "coins", Category: "profit",
			Condition: `{"type":"total_profit","value":100000}`,
			RewardType: "quota", RewardValue: "50000",
			SortOrder: 4, Enabled: true, CreatedAt: now,
		},
		{
			Key: "total_profit_1m", Name: "赌神之手", Description: "累计盈利1000000",
			Icon: "crown", Category: "profit",
			Condition: `{"type":"total_profit","value":1000000}`,
			RewardType: "quota", RewardValue: "200000",
			SortOrder: 5, Enabled: true, CreatedAt: now,
		},
		{
			Key: "games_played_10", Name: "常客", Description: "玩10局",
			Icon: "door", Category: "milestone",
			Condition: `{"type":"games_played","value":10}`,
			RewardType: "quota", RewardValue: "5000",
			SortOrder: 6, Enabled: true, CreatedAt: now,
		},
		{
			Key: "games_played_100", Name: "赌场之王", Description: "玩100局",
			Icon: "throne", Category: "milestone",
			Condition: `{"type":"games_played","value":100}`,
			RewardType: "quota", RewardValue: "50000",
			SortOrder: 7, Enabled: true, CreatedAt: now,
		},
		{
			Key: "single_win_50k", Name: "一夜暴富", Description: "单笔赢50000+",
			Icon: "money_bag", Category: "milestone",
			Condition: `{"type":"single_win","value":50000}`,
			RewardType: "quota", RewardValue: "25000",
			SortOrder: 8, Enabled: true, CreatedAt: now,
		},
		{
			Key: "blackjack_natural", Name: "天生21", Description: "获得自然BJ",
			Icon: "cards", Category: "special",
			Condition: `{"type":"blackjack_natural","value":1}`,
			RewardType: "quota", RewardValue: "10000",
			SortOrder: 9, Enabled: true, CreatedAt: now,
		},
		{
			Key: "poker_royal_flush", Name: "皇家同花顺", Description: "德扑皇家同花顺",
			Icon: "diamond", Category: "special",
			Condition: `{"type":"poker_royal_flush","value":1}`,
			RewardType: "quota", RewardValue: "500000",
			SortOrder: 10, Enabled: true, CreatedAt: now,
		},
		{
			Key: "slots_free_spin", Name: "飞贼降临", Description: "老虎机免费旋转",
			Icon: "snitch", Category: "special",
			Condition: `{"type":"slots_free_spin","value":1}`,
			RewardType: "quota", RewardValue: "10000",
			SortOrder: 11, Enabled: true, CreatedAt: now,
		},
		{
			Key: "allin_win", Name: "高风险赌徒", Description: "All-in并赢",
			Icon: "flame", Category: "special",
			Condition: `{"type":"allin_win","value":1}`,
			RewardType: "quota", RewardValue: "25000",
			SortOrder: 12, Enabled: true, CreatedAt: now,
		},
	}

	for _, a := range achievements {
		if err := DB.Create(&a).Error; err != nil {
			common.SysLog("seed casino achievement failed: " + a.Key + " " + err.Error())
		}
	}
	common.SysLog("seeded 12 default casino achievements")
}
