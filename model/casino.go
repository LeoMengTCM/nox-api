package model

import (
	"errors"
	"fmt"
	"time"

	"github.com/LeoMengTCM/nox-api/common"
	"gorm.io/gorm"
)

// CasinoGameRecord 赌场游戏记录
type CasinoGameRecord struct {
	Id          int    `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId      int    `json:"user_id" gorm:"not null;index:idx_casino_record_user"`
	GameType    string `json:"game_type" gorm:"type:varchar(20);not null;index:idx_casino_record_type"`
	BetAmount   int    `json:"bet_amount" gorm:"not null"`
	Payout      int    `json:"payout" gorm:"default:0"`
	NetProfit   int    `json:"net_profit" gorm:"default:0"`
	Result      string `json:"result" gorm:"type:varchar(10)"`
	Status      string `json:"status" gorm:"type:varchar(10);default:'active'"`
	Details     string `json:"details" gorm:"type:text"`
	CreatedAt   int64  `json:"created_at" gorm:"bigint"`
	CompletedAt *int64 `json:"completed_at,omitempty" gorm:"bigint"`
}

func (CasinoGameRecord) TableName() string {
	return "casino_game_records"
}

// CasinoDailyStats 赌场每日统计
type CasinoDailyStats struct {
	Id          int    `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId      int    `json:"user_id" gorm:"not null;uniqueIndex:idx_casino_daily_ud"`
	Date        string `json:"date" gorm:"type:varchar(10);not null;uniqueIndex:idx_casino_daily_ud"`
	TotalBet    int    `json:"total_bet" gorm:"default:0"`
	TotalWon    int    `json:"total_won" gorm:"default:0"`
	TotalLost   int    `json:"total_lost" gorm:"default:0"`
	GamesPlayed int    `json:"games_played" gorm:"default:0"`
	WinCount    int    `json:"win_count" gorm:"default:0"`
	BiggestWin  int    `json:"biggest_win" gorm:"default:0"`
	CreatedAt   int64  `json:"created_at" gorm:"bigint"`
	UpdatedAt   int64  `json:"updated_at" gorm:"bigint"`
}

func (CasinoDailyStats) TableName() string {
	return "casino_daily_stats"
}

// ==================== CasinoGameRecord CRUD ====================

func CreateGameRecord(record *CasinoGameRecord) error {
	record.CreatedAt = time.Now().Unix()
	return DB.Create(record).Error
}

func GetActiveGame(userId int, gameType string) (*CasinoGameRecord, error) {
	var record CasinoGameRecord
	err := DB.Where("user_id = ? AND game_type = ? AND status = ?", userId, gameType, "active").
		First(&record).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &record, nil
}

func GetGameRecordById(id int) (*CasinoGameRecord, error) {
	var record CasinoGameRecord
	err := DB.First(&record, "id = ?", id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &record, nil
}

func UpdateGameRecord(record *CasinoGameRecord) error {
	return DB.Save(record).Error
}

func GetGameHistory(userId int, gameType string, page, perPage int) ([]CasinoGameRecord, int64, error) {
	var records []CasinoGameRecord
	var total int64

	q := DB.Model(&CasinoGameRecord{}).Where("user_id = ? AND status = ?", userId, "completed")
	if gameType != "" {
		q = q.Where("game_type = ?", gameType)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	if offset < 0 {
		offset = 0
	}
	err := q.Order("created_at desc").Offset(offset).Limit(perPage).Find(&records).Error
	return records, total, err
}

// ==================== CasinoDailyStats CRUD ====================

func GetOrCreateDailyStats(userId int, date string) (*CasinoDailyStats, error) {
	var stats CasinoDailyStats
	err := DB.Where("user_id = ? AND date = ?", userId, date).First(&stats).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			now := time.Now().Unix()
			stats = CasinoDailyStats{
				UserId:    userId,
				Date:      date,
				CreatedAt: now,
				UpdatedAt: now,
			}
			if createErr := DB.Create(&stats).Error; createErr != nil {
				return nil, createErr
			}
			return &stats, nil
		}
		return nil, err
	}
	return &stats, nil
}

func UpdateDailyStats(stats *CasinoDailyStats) error {
	stats.UpdatedAt = time.Now().Unix()
	return DB.Save(stats).Error
}

// ==================== Aggregate Queries ====================

func GetUserCasinoOverallStats(userId int) (map[string]interface{}, error) {
	var result struct {
		TotalBet    int64 `gorm:"column:total_bet"`
		TotalWon    int64 `gorm:"column:total_won"`
		TotalLost   int64 `gorm:"column:total_lost"`
		GamesPlayed int64 `gorm:"column:games_played"`
		WinCount    int64 `gorm:"column:win_count"`
		BiggestWin  int64 `gorm:"column:biggest_win"`
	}

	err := DB.Model(&CasinoDailyStats{}).
		Where("user_id = ?", userId).
		Select("COALESCE(SUM(total_bet), 0) as total_bet, COALESCE(SUM(total_won), 0) as total_won, COALESCE(SUM(total_lost), 0) as total_lost, COALESCE(SUM(games_played), 0) as games_played, COALESCE(SUM(win_count), 0) as win_count, COALESCE(MAX(biggest_win), 0) as biggest_win").
		Scan(&result).Error
	if err != nil {
		return nil, err
	}

	netProfit := result.TotalWon - result.TotalLost
	winRate := 0.0
	if result.GamesPlayed > 0 {
		winRate = float64(result.WinCount) / float64(result.GamesPlayed) * 100
	}

	return map[string]interface{}{
		"total_bet":    result.TotalBet,
		"total_won":    result.TotalWon,
		"total_lost":   result.TotalLost,
		"net_profit":   netProfit,
		"games_played": result.GamesPlayed,
		"win_count":    result.WinCount,
		"biggest_win":  result.BiggestWin,
		"win_rate":     fmt.Sprintf("%.1f", winRate),
	}, nil
}

func GetCasinoLeaderboard(rankType string, limit int) ([]map[string]interface{}, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	var orderCol string
	switch rankType {
	case "profit":
		orderCol = "net_profit"
	case "wagered":
		orderCol = "total_bet"
	case "win_count":
		orderCol = "win_count"
	case "biggest_win":
		orderCol = "biggest_win"
	default:
		orderCol = "net_profit"
	}

	type leaderboardRow struct {
		UserId      int    `gorm:"column:user_id"`
		Username    string `gorm:"column:username"`
		DisplayName string `gorm:"column:display_name"`
		TotalBet    int64  `gorm:"column:total_bet"`
		TotalWon    int64  `gorm:"column:total_won"`
		TotalLost   int64  `gorm:"column:total_lost"`
		NetProfit   int64  `gorm:"column:net_profit"`
		GamesPlayed int64  `gorm:"column:games_played"`
		WinCount    int64  `gorm:"column:win_count"`
		BiggestWin  int64  `gorm:"column:biggest_win"`
	}

	var rows []leaderboardRow
	err := DB.Table("casino_daily_stats").
		Select("casino_daily_stats.user_id, users.username, users.display_name, "+
			"SUM(casino_daily_stats.total_bet) as total_bet, "+
			"SUM(casino_daily_stats.total_won) as total_won, "+
			"SUM(casino_daily_stats.total_lost) as total_lost, "+
			"SUM(casino_daily_stats.total_won) - SUM(casino_daily_stats.total_lost) as net_profit, "+
			"SUM(casino_daily_stats.games_played) as games_played, "+
			"SUM(casino_daily_stats.win_count) as win_count, "+
			"MAX(casino_daily_stats.biggest_win) as biggest_win").
		Joins("JOIN users ON users.id = casino_daily_stats.user_id").
		Group("casino_daily_stats.user_id, users.username, users.display_name").
		Order(orderCol + " desc").
		Limit(limit).
		Find(&rows).Error
	if err != nil {
		return nil, err
	}

	results := make([]map[string]interface{}, len(rows))
	for i, row := range rows {
		displayName := row.DisplayName
		if displayName == "" {
			displayName = row.Username
		}
		// 根据排名类型确定 value 字段
		var value int64
		switch rankType {
		case "profit":
			value = row.NetProfit
		case "wagered":
			value = row.TotalBet
		case "win_count":
			value = row.WinCount
		case "biggest_win":
			value = row.BiggestWin
		case "games":
			value = row.GamesPlayed
		default:
			value = row.NetProfit
		}
		results[i] = map[string]interface{}{
			"rank":         i + 1,
			"user_id":      row.UserId,
			"username":     row.Username,
			"display_name": displayName,
			"value":        value,
			"total_bet":    row.TotalBet,
			"total_won":    row.TotalWon,
			"total_lost":   row.TotalLost,
			"net_profit":   row.NetProfit,
			"games_played": row.GamesPlayed,
			"win_count":    row.WinCount,
			"biggest_win":  row.BiggestWin,
		}
	}
	return results, nil
}

func GetAdminCasinoStats() (map[string]interface{}, error) {
	var overall struct {
		TotalBet    int64 `gorm:"column:total_bet"`
		TotalWon    int64 `gorm:"column:total_won"`
		TotalLost   int64 `gorm:"column:total_lost"`
		GamesPlayed int64 `gorm:"column:games_played"`
	}

	err := DB.Model(&CasinoDailyStats{}).
		Select("COALESCE(SUM(total_bet), 0) as total_bet, COALESCE(SUM(total_won), 0) as total_won, COALESCE(SUM(total_lost), 0) as total_lost, COALESCE(SUM(games_played), 0) as games_played").
		Scan(&overall).Error
	if err != nil {
		return nil, err
	}

	var uniqueUsers int64
	DB.Model(&CasinoDailyStats{}).Distinct("user_id").Count(&uniqueUsers)

	var todayStats struct {
		TotalBet    int64 `gorm:"column:total_bet"`
		TotalWon    int64 `gorm:"column:total_won"`
		GamesPlayed int64 `gorm:"column:games_played"`
	}
	today := time.Now().Format("2006-01-02")
	DB.Model(&CasinoDailyStats{}).
		Where("date = ?", today).
		Select("COALESCE(SUM(total_bet), 0) as total_bet, COALESCE(SUM(total_won), 0) as total_won, COALESCE(SUM(games_played), 0) as games_played").
		Scan(&todayStats)

	houseProfit := overall.TotalLost - overall.TotalWon

	return map[string]interface{}{
		"total_wagered":      overall.TotalBet,
		"total_paid_out":     overall.TotalWon,
		"total_collected":    overall.TotalLost,
		"house_profit":       houseProfit,
		"total_bets":         overall.GamesPlayed,
		"active_users":       uniqueUsers,
		"today_wagered":      todayStats.TotalBet,
		"today_paid_out":     todayStats.TotalWon,
		"today_games_played": todayStats.GamesPlayed,
	}, nil
}

func GetAdminCasinoUsers(page, perPage int, search string) ([]map[string]interface{}, int64, error) {
	type userRow struct {
		UserId      int    `gorm:"column:user_id"`
		Username    string `gorm:"column:username"`
		DisplayName string `gorm:"column:display_name"`
		TotalBet    int64  `gorm:"column:total_bet"`
		TotalWon    int64  `gorm:"column:total_won"`
		TotalLost   int64  `gorm:"column:total_lost"`
		NetProfit   int64  `gorm:"column:net_profit"`
		GamesPlayed int64  `gorm:"column:games_played"`
	}

	q := DB.Table("casino_daily_stats").
		Select("casino_daily_stats.user_id, users.username, users.display_name, "+
			"SUM(casino_daily_stats.total_bet) as total_bet, "+
			"SUM(casino_daily_stats.total_won) as total_won, "+
			"SUM(casino_daily_stats.total_lost) as total_lost, "+
			"SUM(casino_daily_stats.total_won) - SUM(casino_daily_stats.total_lost) as net_profit, "+
			"SUM(casino_daily_stats.games_played) as games_played").
		Joins("JOIN users ON users.id = casino_daily_stats.user_id").
		Group("casino_daily_stats.user_id, users.username, users.display_name")

	if search != "" {
		q = q.Where("users.username LIKE ?", "%"+search+"%")
	}

	var total int64
	countQ := DB.Table("casino_daily_stats").
		Joins("JOIN users ON users.id = casino_daily_stats.user_id").
		Distinct("casino_daily_stats.user_id")
	if search != "" {
		countQ = countQ.Where("users.username LIKE ?", "%"+search+"%")
	}
	countQ.Count(&total)

	offset := (page - 1) * perPage
	if offset < 0 {
		offset = 0
	}

	var rows []userRow
	err := q.Order("total_bet desc").Offset(offset).Limit(perPage).Find(&rows).Error
	if err != nil {
		return nil, 0, err
	}

	results := make([]map[string]interface{}, len(rows))
	for i, row := range rows {
		displayName := row.DisplayName
		if displayName == "" {
			displayName = row.Username
		}
		// 检查封禁状态
		banKey := fmt.Sprintf("casino_ban.%d", row.UserId)
		common.OptionMapRWMutex.RLock()
		banVal, banOk := common.OptionMap[banKey]
		common.OptionMapRWMutex.RUnlock()
		banned := banOk && banVal == "true"

		results[i] = map[string]interface{}{
			"user_id":       row.UserId,
			"username":      row.Username,
			"display_name":  displayName,
			"total_wagered": row.TotalBet,
			"total_won":     row.TotalWon,
			"total_lost":    row.TotalLost,
			"net_profit":    row.NetProfit,
			"games_played":  row.GamesPlayed,
			"banned":        banned,
		}
	}

	return results, total, nil
}

// SafeDecreaseQuotaForBet 原子扣款 — 仅当余额充足时才扣除
// 返回 true 表示扣款成功，false 表示余额不足
func SafeDecreaseQuotaForBet(userId int, amount int) (bool, error) {
	if amount <= 0 {
		return false, errors.New("扣款金额必须为正数")
	}
	result := DB.Model(&User{}).
		Where("id = ? AND quota >= ?", userId, amount).
		Update("quota", gorm.Expr("quota - ?", amount))
	if result.Error != nil {
		return false, result.Error
	}
	return result.RowsAffected > 0, nil
}
