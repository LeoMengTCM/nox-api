package service

import (
	"errors"
	"fmt"
	"time"

	"github.com/LeoMengTCM/nox-api/common"
	"github.com/LeoMengTCM/nox-api/logger"
	"github.com/LeoMengTCM/nox-api/model"
	"github.com/LeoMengTCM/nox-api/setting/operation_setting"
)

// ValidateBet 验证下注
func ValidateBet(userId int, amount int, gameType string) error {
	if !operation_setting.IsCasinoEnabled() {
		return errors.New("赌场系统未启用")
	}

	if !operation_setting.IsGameEnabled(gameType) {
		return errors.New("该游戏未启用")
	}

	// 检查用户是否被封禁
	if IsUserCasinoBanned(userId) {
		return errors.New("你的赌场权限已被封禁")
	}

	minBet := operation_setting.GetMinBet()
	maxBet := operation_setting.GetMaxBet()

	if amount < minBet {
		return fmt.Errorf("下注金额不足，最低 %s", logger.LogQuota(minBet))
	}
	if amount > maxBet {
		return fmt.Errorf("下注金额超出限制，最高 %s", logger.LogQuota(maxBet))
	}

	// 检查用户余额
	quota, err := model.GetUserQuota(userId, false)
	if err != nil {
		return errors.New("获取用户余额失败")
	}
	if quota < amount {
		return errors.New("余额不足")
	}

	// 检查每日亏损限制
	dailyLossLimit := operation_setting.GetDailyLossLimit()
	today := time.Now().Format("2006-01-02")
	stats, err := model.GetOrCreateDailyStats(userId, today)
	if err != nil {
		return errors.New("获取每日统计失败")
	}

	currentLoss := stats.TotalLost - stats.TotalWon
	if currentLoss < 0 {
		currentLoss = 0
	}
	if currentLoss+amount > dailyLossLimit {
		return fmt.Errorf("已接近每日亏损限额 %s，请明天再来", logger.LogQuota(dailyLossLimit))
	}

	return nil
}

// PlaceBet 扣除下注额度（原子操作，防止并发导致负余额）
func PlaceBet(userId int, amount int) error {
	ok, err := model.SafeDecreaseQuotaForBet(userId, amount)
	if err != nil {
		return errors.New("下注扣款失败")
	}
	if !ok {
		return errors.New("余额不足")
	}
	model.RecordLog(userId, model.LogTypeSystem, fmt.Sprintf("赌场下注 %s", logger.LogQuota(amount)))
	return nil
}

// SettleBet 结算游戏
// gameExtra 用于传递额外的游戏信息给成就系统，可为 nil
func SettleBet(userId int, record *model.CasinoGameRecord, result string, payout int, gameExtra ...map[string]interface{}) error {
	now := time.Now().Unix()
	record.Result = result
	record.Status = "completed"
	record.Payout = payout
	record.NetProfit = payout - record.BetAmount
	record.CompletedAt = &now

	// 发放奖金
	if payout > 0 {
		err := model.IncreaseUserQuota(userId, payout, true)
		if err != nil {
			return errors.New("奖金发放失败")
		}
		if payout > record.BetAmount {
			model.RecordLog(userId, model.LogTypeSystem, fmt.Sprintf("赌场赢得 %s (下注 %s)", logger.LogQuota(payout), logger.LogQuota(record.BetAmount)))
		} else if payout == record.BetAmount {
			model.RecordLog(userId, model.LogTypeSystem, fmt.Sprintf("赌场平局，退回 %s", logger.LogQuota(payout)))
		}
	} else {
		model.RecordLog(userId, model.LogTypeSystem, fmt.Sprintf("赌场输掉 %s", logger.LogQuota(record.BetAmount)))
	}

	// 更新游戏记录
	if err := model.UpdateGameRecord(record); err != nil {
		return err
	}

	// 更新每日统计
	today := time.Now().Format("2006-01-02")
	stats, err := model.GetOrCreateDailyStats(userId, today)
	if err != nil {
		return nil // 不影响主流程
	}

	stats.TotalBet += record.BetAmount
	stats.GamesPlayed++

	if payout > record.BetAmount {
		// 赢了
		winAmount := payout - record.BetAmount
		stats.TotalWon += winAmount
		stats.WinCount++
		if winAmount > stats.BiggestWin {
			stats.BiggestWin = winAmount
		}
	} else if payout < record.BetAmount {
		// 输了
		lostAmount := record.BetAmount - payout
		stats.TotalLost += lostAmount
	}

	_ = model.UpdateDailyStats(stats)

	// 成就检查（异步，不影响主流程）
	go func() {
		defer func() {
			if r := recover(); r != nil {
				fmt.Printf("赌场成就检查panic: %v\n", r)
			}
		}()
		gameResult := map[string]interface{}{
			"game_type":  record.GameType,
			"bet_amount": record.BetAmount,
			"payout":     payout,
			"result":     result,
		}
		if len(gameExtra) > 0 && gameExtra[0] != nil {
			for k, v := range gameExtra[0] {
				gameResult[k] = v
			}
		}
		_, _ = CheckAndUpdateAchievements(userId, gameResult)

		// 大赢记录：payout >= 5 * betAmount
		if payout >= 5*record.BetAmount && record.BetAmount > 0 {
			username, _ := model.GetUsernameById(userId, false)
			multiplier := float64(payout) / float64(record.BetAmount)
			_ = model.CreateBigWin(&model.CasinoBigWin{
				UserId:     userId,
				Username:   username,
				GameType:   record.GameType,
				BetAmount:  float64(record.BetAmount),
				Payout:     float64(payout),
				Multiplier: multiplier,
			})
		}
	}()

	return nil
}

// GetCasinoConfig 获取赌场配置（面向用户）
func GetCasinoConfig(userId int) (map[string]interface{}, error) {
	setting := operation_setting.GetCasinoSetting()

	quota, _ := model.GetUserQuota(userId, false)

	games := []map[string]interface{}{}
	gameTypes := []struct {
		Type    string
		Name    string
		Enabled bool
	}{
		{"blackjack", "21点", setting.BlackjackEnabled},
		{"dice", "骰子", setting.DiceEnabled},
		{"roulette", "轮盘", setting.RouletteEnabled},
		{"baccarat", "百家乐", setting.BaccaratEnabled},
		{"slots", "老虎机", setting.SlotsEnabled},
		{"poker", "扑克", setting.PokerEnabled},
	}
	for _, g := range gameTypes {
		if g.Enabled {
			games = append(games, map[string]interface{}{
				"type": g.Type,
				"name": g.Name,
			})
		}
	}

	return map[string]interface{}{
		"enabled":          setting.Enabled,
		"min_bet":          operation_setting.GetMinBet(),
		"max_bet":          operation_setting.GetMaxBet(),
		"daily_loss_limit": operation_setting.GetDailyLossLimit(),
		"games":            games,
		"user_balance":     quota,
		"vault_balance":    model.GetGringottsVaultBalance(),
	}, nil
}

// GetUserCasinoStats 获取用户赌场统计
func GetUserCasinoStats(userId int) (map[string]interface{}, error) {
	overallStats, err := model.GetUserCasinoOverallStats(userId)
	if err != nil {
		return nil, err
	}

	quota, _ := model.GetUserQuota(userId, false)
	overallStats["balance"] = quota

	// 添加前端期望的别名字段
	if tb, ok := overallStats["total_bet"]; ok {
		overallStats["total_wagered"] = tb
	}

	// 今日统计（展平为前端期望的格式）
	today := time.Now().Format("2006-01-02")
	dailyStats, err := model.GetOrCreateDailyStats(userId, today)
	if err == nil {
		overallStats["daily_loss_today"] = dailyStats.TotalLost - dailyStats.TotalWon
		overallStats["today"] = map[string]interface{}{
			"total_bet":    dailyStats.TotalBet,
			"total_won":    dailyStats.TotalWon,
			"total_lost":   dailyStats.TotalLost,
			"games_played": dailyStats.GamesPlayed,
			"win_count":    dailyStats.WinCount,
		}
	}

	return overallStats, nil
}

// IsUserCasinoBanned 检查用户是否被赌场封禁
func IsUserCasinoBanned(userId int) bool {
	key := fmt.Sprintf("casino_ban.%d", userId)
	common.OptionMapRWMutex.RLock()
	val, ok := common.OptionMap[key]
	common.OptionMapRWMutex.RUnlock()
	return ok && val == "true"
}
