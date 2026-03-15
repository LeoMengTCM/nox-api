package service

import (
	"errors"
	"fmt"
	"strconv"

	"github.com/LeoMengTCM/nox-api/common"
	"github.com/LeoMengTCM/nox-api/logger"
	"github.com/LeoMengTCM/nox-api/model"
)

// achievementCondition 成就条件结构
type achievementCondition struct {
	Type  string `json:"type"`
	Value int64  `json:"value"`
}

// CheckAndUpdateAchievements 检查并更新用户成就进度
// gameResult 包含当前游戏的结果信息：
//
//	game_type, bet_amount, payout, result, is_natural_blackjack, is_royal_flush, has_free_spin, is_allin
func CheckAndUpdateAchievements(userId int, gameResult map[string]interface{}) ([]map[string]interface{}, error) {
	// 获取所有启用的成就
	achievements, err := model.GetAllEnabledAchievements()
	if err != nil {
		return nil, err
	}

	// 获取用户当前成就进度
	userAchievements, err := model.GetUserAchievements(userId)
	if err != nil {
		return nil, err
	}
	userAchMap := make(map[int]*model.CasinoUserAchievement)
	for i := range userAchievements {
		userAchMap[userAchievements[i].AchievementId] = &userAchievements[i]
	}

	// 获取用户总体统计
	overallStats, err := model.GetUserCasinoOverallStats(userId)
	if err != nil {
		return nil, err
	}

	// 获取当前连胜数
	winStreak, _ := model.GetCurrentWinStreak(userId)

	var newlyCompleted []map[string]interface{}

	for _, ach := range achievements {
		// 跳过已完成的
		ua := userAchMap[ach.Id]
		if ua != nil && ua.Completed {
			continue
		}

		// 解析条件
		var cond achievementCondition
		if err := common.UnmarshalJsonStr(ach.Condition, &cond); err != nil {
			continue
		}

		// 检查条件是否满足
		met := checkCondition(cond, overallStats, gameResult, winStreak)
		if !met {
			continue
		}

		// 创建或更新用户成就记录
		if ua == nil {
			ua = &model.CasinoUserAchievement{
				UserId:        userId,
				AchievementId: ach.Id,
				Progress:      int(cond.Value),
				Completed:     true,
			}
			if err := model.CreateUserAchievement(ua); err != nil {
				continue
			}
		} else {
			ua.Progress = int(cond.Value)
			ua.Completed = true
			if err := model.UpdateUserAchievement(ua); err != nil {
				continue
			}
		}

		newlyCompleted = append(newlyCompleted, map[string]interface{}{
			"achievement_id": ach.Id,
			"key":            ach.Key,
			"name":           ach.Name,
			"description":    ach.Description,
			"icon":           ach.Icon,
			"reward_type":    ach.RewardType,
			"reward_value":   ach.RewardValue,
		})
	}

	return newlyCompleted, nil
}

// checkCondition 检查单个成就条件是否满足
func checkCondition(cond achievementCondition, stats map[string]interface{}, gameResult map[string]interface{}, winStreak int) bool {
	switch cond.Type {
	case "first_bet":
		gamesPlayed := toInt64(stats["games_played"])
		return gamesPlayed >= cond.Value

	case "win_streak":
		return int64(winStreak) >= cond.Value

	case "total_profit":
		netProfit := toInt64(stats["net_profit"])
		return netProfit >= cond.Value

	case "games_played":
		gamesPlayed := toInt64(stats["games_played"])
		return gamesPlayed >= cond.Value

	case "single_win":
		payout := toInt64(gameResult["payout"])
		betAmount := toInt64(gameResult["bet_amount"])
		winAmount := payout - betAmount
		return winAmount >= cond.Value

	case "blackjack_natural":
		result, _ := gameResult["result"].(string)
		gameType, _ := gameResult["game_type"].(string)
		return gameType == "blackjack" && result == "blackjack"

	case "poker_royal_flush":
		isRoyal, _ := gameResult["is_royal_flush"].(bool)
		return isRoyal

	case "slots_free_spin":
		hasFreeSpin, _ := gameResult["has_free_spin"].(bool)
		return hasFreeSpin

	case "allin_win":
		isAllIn, _ := gameResult["is_allin"].(bool)
		result, _ := gameResult["result"].(string)
		return isAllIn && (result == "win" || result == "blackjack")
	}
	return false
}

// ClaimAchievementReward 领取成就奖励
func ClaimAchievementReward(userId int, achievementId int) (map[string]interface{}, error) {
	// 获取成就定义
	ach, err := model.GetAchievementById(achievementId)
	if err != nil {
		return nil, errors.New("成就不存在")
	}

	// 原子性领取：UPDATE WHERE claimed_at IS NULL，防止并发重复领取
	claimed, err := model.AtomicClaimAchievement(userId, achievementId)
	if err != nil {
		return nil, errors.New("领取失败")
	}
	if !claimed {
		// 可能是未完成、不存在、或已领取
		ua, _ := model.GetUserAchievement(userId, achievementId)
		if ua == nil {
			return nil, errors.New("成就未解锁")
		}
		if !ua.Completed {
			return nil, errors.New("成就未完成")
		}
		return nil, errors.New("奖励已领取")
	}

	// 原子领取成功，发放奖励
	if ach.RewardType == "quota" {
		rewardAmount, err := strconv.Atoi(ach.RewardValue)
		if err != nil || rewardAmount <= 0 {
			return nil, errors.New("奖励配置错误")
		}
		if err := model.IncreaseUserQuota(userId, rewardAmount, true); err != nil {
			return nil, errors.New("奖励发放失败")
		}
		model.RecordLog(userId, model.LogTypeSystem,
			fmt.Sprintf("领取成就奖励「%s」 +%s", ach.Name, logger.LogQuota(rewardAmount)))
	}

	return map[string]interface{}{
		"achievement_id": ach.Id,
		"name":           ach.Name,
		"reward_type":    ach.RewardType,
		"reward_value":   ach.RewardValue,
		"claimed":        true,
	}, nil
}

// GetUserAchievementStatus 获取用户所有成就状态
func GetUserAchievementStatus(userId int) ([]map[string]interface{}, error) {
	// 获取所有启用的成就
	achievements, err := model.GetAllEnabledAchievements()
	if err != nil {
		return nil, err
	}

	// 获取用户进度
	userAchievements, err := model.GetUserAchievements(userId)
	if err != nil {
		return nil, err
	}
	userAchMap := make(map[int]*model.CasinoUserAchievement)
	for i := range userAchievements {
		userAchMap[userAchievements[i].AchievementId] = &userAchievements[i]
	}

	result := make([]map[string]interface{}, len(achievements))
	for i, ach := range achievements {
		// 解析 condition 获取 target 值
		var cond struct {
			Target int `json:"target"`
		}
		_ = common.UnmarshalJsonStr(ach.Condition, &cond)
		target := cond.Target
		if target <= 0 {
			target = 1
		}

		entry := map[string]interface{}{
			"id":           ach.Id,
			"key":          ach.Key,
			"name":         ach.Name,
			"description":  ach.Description,
			"icon":         ach.Icon,
			"category":     ach.Category,
			"reward_type":  ach.RewardType,
			"reward_value": ach.RewardValue,
			"sort_order":   ach.SortOrder,
			"target":       target,
			"progress":     0,
			"completed":    false,
			"claimed":      false,
		}

		if ua, ok := userAchMap[ach.Id]; ok {
			entry["progress"] = ua.Progress
			entry["completed"] = ua.Completed
			entry["claimed"] = ua.ClaimedAt != nil
		}

		result[i] = entry
	}

	return result, nil
}

// toInt64 安全地将 interface{} 转为 int64
func toInt64(v interface{}) int64 {
	switch val := v.(type) {
	case int:
		return int64(val)
	case int64:
		return val
	case float64:
		return int64(val)
	case string:
		n, _ := strconv.ParseInt(val, 10, 64)
		return n
	}
	return 0
}
