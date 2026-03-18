package model

import (
	"time"

	"github.com/LeoMengTCM/nox-api/common"
	"gorm.io/gorm"
)

// PetArenaSeason 对战赛季
type PetArenaSeason struct {
	Id      int    `json:"id" gorm:"primaryKey;autoIncrement"`
	Name    string `json:"name" gorm:"type:varchar(64)"`
	StartAt int64  `json:"start_at" gorm:"bigint"`
	EndAt   int64  `json:"end_at" gorm:"bigint"`
	Status  string `json:"status" gorm:"type:varchar(10);default:'active'"` // active, ended
}

func (PetArenaSeason) TableName() string {
	return "pet_arena_seasons"
}

// PetArenaDefender 守擂设置
type PetArenaDefender struct {
	Id        int   `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId    int   `json:"user_id" gorm:"uniqueIndex"`
	PetId     int   `json:"pet_id" gorm:"not null"`
	Rating    int   `json:"rating" gorm:"default:1000;index:idx_defender_rating"`
	WinCount  int   `json:"win_count" gorm:"default:0"`
	LossCount int   `json:"loss_count" gorm:"default:0"`
	WinStreak int   `json:"win_streak" gorm:"default:0"`
	MaxStreak int   `json:"max_streak" gorm:"default:0"`
	SeasonId  int   `json:"season_id" gorm:"index:idx_defender_season"`
	CreatedAt int64 `json:"created_at" gorm:"bigint"`
	UpdatedAt int64 `json:"updated_at" gorm:"bigint"`
}

func (PetArenaDefender) TableName() string {
	return "pet_arena_defenders"
}

// PetArenaBattle 战斗记录
type PetArenaBattle struct {
	Id                   int    `json:"id" gorm:"primaryKey;autoIncrement"`
	SeasonId             int    `json:"season_id" gorm:"index:idx_battle_season"`
	AttackerUserId       int    `json:"attacker_user_id" gorm:"not null"`
	AttackerPetId        int    `json:"attacker_pet_id" gorm:"not null"`
	DefenderUserId       int    `json:"defender_user_id" gorm:"not null"`
	DefenderPetId        int    `json:"defender_pet_id" gorm:"not null"`
	WinnerUserId         int    `json:"winner_user_id" gorm:"default:0"`
	AttackerRatingBefore int    `json:"attacker_rating_before" gorm:"default:0"`
	AttackerRatingAfter  int    `json:"attacker_rating_after" gorm:"default:0"`
	DefenderRatingBefore int    `json:"defender_rating_before" gorm:"default:0"`
	DefenderRatingAfter  int    `json:"defender_rating_after" gorm:"default:0"`
	BattleLog            string `json:"battle_log" gorm:"type:text"` // JSON rounds
	RewardQuota          int    `json:"reward_quota" gorm:"default:0"`
	CreatedAt            int64  `json:"created_at" gorm:"bigint;index:idx_battle_created"`
}

func (PetArenaBattle) TableName() string {
	return "pet_arena_battles"
}

// ==================== Season CRUD ====================

func GetActiveSeason() (*PetArenaSeason, error) {
	var season PetArenaSeason
	err := DB.Where("status = ?", "active").Order("id desc").First(&season).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &season, nil
}

func CreateSeason(season *PetArenaSeason) error {
	return DB.Create(season).Error
}

func EndSeason(seasonId int) error {
	return DB.Model(&PetArenaSeason{}).Where("id = ?", seasonId).Update("status", "ended").Error
}

// ==================== Defender CRUD ====================

func GetDefender(userId int) (*PetArenaDefender, error) {
	var defender PetArenaDefender
	err := DB.Where("user_id = ?", userId).First(&defender).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &defender, nil
}

func CreateOrUpdateDefender(defender *PetArenaDefender) error {
	now := time.Now().Unix()
	existing, _ := GetDefender(defender.UserId)
	if existing != nil {
		existing.PetId = defender.PetId
		existing.SeasonId = defender.SeasonId
		existing.UpdatedAt = now
		return DB.Save(existing).Error
	}
	defender.CreatedAt = now
	defender.UpdatedAt = now
	if defender.Rating == 0 {
		defender.Rating = 1000
	}
	return DB.Create(defender).Error
}

func UpdateDefender(defender *PetArenaDefender) error {
	defender.UpdatedAt = time.Now().Unix()
	return DB.Save(defender).Error
}

func GetArenaRanking(seasonId int, limit int) ([]map[string]interface{}, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	type rankRow struct {
		UserId      int    `gorm:"column:user_id"`
		PetId       int    `gorm:"column:pet_id"`
		Rating      int    `gorm:"column:rating"`
		WinCount    int    `gorm:"column:win_count"`
		LossCount   int    `gorm:"column:loss_count"`
		WinStreak   int    `gorm:"column:win_streak"`
		MaxStreak   int    `gorm:"column:max_streak"`
		Username    string `gorm:"column:username"`
		DisplayName string `gorm:"column:display_name"`
		AvatarUrl   string `gorm:"column:avatar_url"`
	}

	var rows []rankRow
	q := DB.Table("pet_arena_defenders").
		Select("pet_arena_defenders.user_id, pet_arena_defenders.pet_id, pet_arena_defenders.rating, "+
			"pet_arena_defenders.win_count, pet_arena_defenders.loss_count, "+
			"pet_arena_defenders.win_streak, pet_arena_defenders.max_streak, "+
			"users.username, users.display_name, users.avatar_url").
		Joins("JOIN users ON users.id = pet_arena_defenders.user_id")

	if seasonId > 0 {
		q = q.Where("pet_arena_defenders.season_id = ?", seasonId)
	}

	err := q.Order("pet_arena_defenders.rating desc").Limit(limit).Find(&rows).Error
	if err != nil {
		return nil, err
	}

	results := make([]map[string]interface{}, len(rows))
	for i, row := range rows {
		displayName := row.DisplayName
		if displayName == "" {
			displayName = row.Username
		}
		results[i] = map[string]interface{}{
			"rank":         i + 1,
			"user_id":      row.UserId,
			"pet_id":       row.PetId,
			"rating":       row.Rating,
			"win_count":    row.WinCount,
			"loss_count":   row.LossCount,
			"win_streak":   row.WinStreak,
			"max_streak":   row.MaxStreak,
			"username":     row.Username,
			"display_name": displayName,
			"avatar_url":   row.AvatarUrl,
		}
	}
	return results, nil
}

func GetDefenderList(seasonId int, limit, offset int) ([]PetArenaDefender, int64, error) {
	var defenders []PetArenaDefender
	var total int64

	q := DB.Model(&PetArenaDefender{})
	if seasonId > 0 {
		q = q.Where("season_id = ?", seasonId)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := q.Order("rating desc").Offset(offset).Limit(limit).Find(&defenders).Error
	return defenders, total, err
}

// ==================== Battle CRUD ====================

func CreateBattle(battle *PetArenaBattle) error {
	battle.CreatedAt = time.Now().Unix()
	return DB.Create(battle).Error
}

func GetBattleById(id int) (*PetArenaBattle, error) {
	var battle PetArenaBattle
	err := DB.First(&battle, "id = ?", id).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &battle, nil
}

func GetUserBattleHistory(userId int, page, perPage int) ([]PetArenaBattle, int64, error) {
	var battles []PetArenaBattle
	var total int64

	q := DB.Model(&PetArenaBattle{}).
		Where("attacker_user_id = ? OR defender_user_id = ?", userId, userId)

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	if offset < 0 {
		offset = 0
	}
	err := q.Order("created_at desc").Offset(offset).Limit(perPage).Find(&battles).Error
	return battles, total, err
}

func GetTodayAttackCount(userId int) int64 {
	var count int64
	todayStart := time.Now().Truncate(24 * time.Hour).Unix()
	DB.Model(&PetArenaBattle{}).
		Where("attacker_user_id = ? AND created_at >= ?", userId, todayStart).
		Count(&count)
	return count
}

func GetSeasonTopDefenders(seasonId int, limit int) ([]PetArenaDefender, error) {
	var defenders []PetArenaDefender
	err := DB.Where("season_id = ?", seasonId).
		Order("rating desc").Limit(limit).Find(&defenders).Error
	return defenders, err
}

func GetAllSeasonDefenders(seasonId int) ([]PetArenaDefender, error) {
	var defenders []PetArenaDefender
	err := DB.Where("season_id = ?", seasonId).Find(&defenders).Error
	return defenders, err
}

// ==================== Seed ====================

func SeedFirstSeason() {
	var count int64
	DB.Model(&PetArenaSeason{}).Count(&count)
	if count > 0 {
		return
	}

	now := time.Now().Unix()
	season := PetArenaSeason{
		Name:    "第一届三强争霸赛",
		StartAt: now,
		EndAt:   now + 30*24*3600,
		Status:  "active",
	}
	if err := DB.Create(&season).Error; err != nil {
		common.SysLog("seed first arena season failed: " + err.Error())
		return
	}
	common.SysLog("seeded first arena season")
}
