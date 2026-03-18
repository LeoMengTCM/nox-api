package service

import (
	"errors"
	"fmt"
	"math/rand"
	"time"

	"github.com/LeoMengTCM/nox-api/common"
	"github.com/LeoMengTCM/nox-api/logger"
	"github.com/LeoMengTCM/nox-api/model"
	"github.com/LeoMengTCM/nox-api/setting/operation_setting"
)

// 打劫类型配置
type heistConfig struct {
	Fee        int     // 入场费 (quota)
	Cooldown   int64   // 冷却时间 (秒)
	BaseRate   float64 // 基础成功率
	MinPct     float64 // 最小金库百分比奖励
	MaxPct     float64 // 最大金库百分比奖励
	Name       string  // 显示名
	Narrative  string  // 叙事
}

var heistConfigs = map[string]heistConfig{
	"sneak": {
		Fee: 50000, Cooldown: 4 * 3600, BaseRate: 0.60,
		MinPct: 0.001, MaxPct: 0.005,
		Name: "隐形斗篷潜入", Narrative: "你披上隐形斗篷，悄悄溜进古灵阁的地下金库...",
	},
	"dragon": {
		Fee: 250000, Cooldown: 12 * 3600, BaseRate: 0.35,
		MinPct: 0.005, MaxPct: 0.02,
		Name: "骑龙闯关", Narrative: "你跃上乌克兰铁肚皮龙，冲破古灵阁的穹顶...",
	},
	"imperio": {
		Fee: 1000000, Cooldown: 24 * 3600, BaseRate: 0.15,
		MinPct: 0.02, MaxPct: 0.05,
		Name: "夺魂咒控制妖精", Narrative: "你对一名妖精施放了夺魂咒，命令他打开最深处的金库...",
	},
}

// GetGringottsInfo 获取金库信息（面向用户）
func GetGringottsInfo(userId int) (map[string]interface{}, error) {
	if !operation_setting.IsCasinoEnabled() {
		return nil, errors.New("赌场系统未启用")
	}

	vaultBalance := model.GetGringottsVaultBalance()

	// 获取各类型冷却状态
	cooldowns := make(map[string]interface{})
	for heistType, cfg := range heistConfigs {
		lastRecord, _ := model.GetLastHeistByType(userId, heistType)
		var cooldownEnds int64
		var available bool
		if lastRecord == nil {
			available = true
		} else {
			cooldownEnds = lastRecord.CreatedAt + cfg.Cooldown
			available = time.Now().Unix() >= cooldownEnds
		}
		cooldowns[heistType] = map[string]interface{}{
			"name":          cfg.Name,
			"fee":           cfg.Fee,
			"fee_display":   logger.LogQuota(cfg.Fee),
			"cooldown_ends": cooldownEnds,
			"available":     available,
			"base_rate":     fmt.Sprintf("%.0f%%", cfg.BaseRate*100),
		}
	}

	// 最近5条记录
	records, _, _ := model.GetHeistHistory(userId, 1, 5)

	return map[string]interface{}{
		"vault_balance":         vaultBalance,
		"vault_balance_display": logger.LogQuota(int(vaultBalance)),
		"cooldowns":             cooldowns,
		"recent_records":        records,
	}, nil
}

// ExecuteHeist 执行打劫
func ExecuteHeist(userId int, heistType string) (map[string]interface{}, error) {
	if !operation_setting.IsCasinoEnabled() {
		return nil, errors.New("赌场系统未启用")
	}

	if IsUserCasinoBanned(userId) {
		return nil, errors.New("你的赌场权限已被封禁")
	}

	cfg, ok := heistConfigs[heistType]
	if !ok {
		return nil, errors.New("无效的打劫方式")
	}

	// 检查冷却
	lastRecord, _ := model.GetLastHeistByType(userId, heistType)
	if lastRecord != nil {
		cooldownEnds := lastRecord.CreatedAt + cfg.Cooldown
		if time.Now().Unix() < cooldownEnds {
			remaining := cooldownEnds - time.Now().Unix()
			hours := remaining / 3600
			minutes := (remaining % 3600) / 60
			return nil, fmt.Errorf("冷却中，还需等待 %d小时%d分钟", hours, minutes)
		}
	}

	// 检查余额（入场费）
	quota, err := model.GetUserQuota(userId, false)
	if err != nil {
		return nil, errors.New("获取余额失败")
	}
	if quota < cfg.Fee {
		return nil, fmt.Errorf("入场费不足，需要 %s", logger.LogQuota(cfg.Fee))
	}

	// 扣除入场费
	ok, err = model.SafeDecreaseQuotaForBet(userId, cfg.Fee)
	if err != nil || !ok {
		return nil, errors.New("扣除入场费失败，余额不足")
	}

	// 获取金库余额
	vaultBalance := model.GetGringottsVaultBalance()

	// 计算成功率
	successRate := cfg.BaseRate

	// +5% 有 SSR 宠物
	var ssrCount int64
	model.DB.Model(&model.UserPet{}).Where("user_id = ? AND rarity = ?", userId, "SSR").Count(&ssrCount)
	if ssrCount > 0 {
		successRate += 0.05
	}

	// +3% 赌场连胜≥5 (检查最近连续胜利)
	var recentWins int64
	model.DB.Model(&model.CasinoGameRecord{}).
		Where("user_id = ? AND status = ? AND result = ?", userId, "completed", "win").
		Order("created_at desc").Limit(5).Count(&recentWins)
	if recentWins >= 5 {
		successRate += 0.03
	}

	// -5% 24h内有人打劫成功
	recentSuccess, _ := model.GetRecentSuccessfulHeist(24 * 3600)
	if recentSuccess != nil {
		successRate -= 0.05
	}

	// 限制范围
	if successRate < 0.05 {
		successRate = 0.05
	}
	if successRate > 0.90 {
		successRate = 0.90
	}

	// 掷骰子
	roll := rand.Float64()
	success := roll < successRate

	record := &model.GringottsHeistRecord{
		UserId:      userId,
		HeistType:   heistType,
		EntranceFee: cfg.Fee,
		VaultBefore: vaultBalance,
		Success:     success,
	}

	result := map[string]interface{}{
		"heist_type":   heistType,
		"success":      success,
		"entrance_fee": cfg.Fee,
		"vault_before": vaultBalance,
	}

	if success {
		// 计算奖励：金库余额的 MinPct ~ MaxPct
		pct := cfg.MinPct + rand.Float64()*(cfg.MaxPct-cfg.MinPct)
		reward := int(float64(vaultBalance) * pct)
		if reward < 1000 {
			reward = 1000 // 最低奖励
		}

		record.Reward = reward

		// 发放奖励
		_ = model.IncreaseUserQuota(userId, reward, true)
		model.RecordLog(userId, model.LogTypeSystem, fmt.Sprintf("古灵阁打劫成功(%s)，获得 %s", cfg.Name, logger.LogQuota(reward)))

		// 全服跑马灯
		username, _ := model.GetUsernameById(userId, false)
		_ = model.CreateBigWin(&model.CasinoBigWin{
			UserId:     userId,
			Username:   username,
			GameType:   "gringotts_" + heistType,
			BetAmount:  float64(cfg.Fee),
			Payout:     float64(reward),
			Multiplier: float64(reward) / float64(cfg.Fee),
		})

		detailsMap := map[string]interface{}{
			"narrative":    cfg.Narrative + "成功了！你从金库中带走了一袋金加隆！",
			"success_rate": fmt.Sprintf("%.1f%%", successRate*100),
			"vault_pct":    fmt.Sprintf("%.2f%%", pct*100),
		}
		detailsJSON, _ := common.Marshal(detailsMap)
		record.Details = string(detailsJSON)

		result["reward"] = reward
		result["reward_display"] = logger.LogQuota(reward)
		result["narrative"] = cfg.Narrative + "成功了！你从金库中带走了一袋金加隆！"

		// 异步检查称号
		go func() {
			defer func() { recover() }()
			CheckHeistTitles(userId)
		}()

	} else {
		// 失败惩罚
		penalty := 0
		narrative := cfg.Narrative + "失败了！"

		// 50% 概率额外罚入场费50%
		if rand.Float64() < 0.5 {
			extraPenalty := cfg.Fee / 2
			ok2, _ := model.SafeDecreaseQuotaForBet(userId, extraPenalty)
			if ok2 {
				penalty = extraPenalty
				narrative += "妖精们发现了你，额外罚没了一笔金加隆！"
			}
		}

		// 5% 概率赌场禁入6h
		if rand.Float64() < 0.05 {
			banKey := fmt.Sprintf("casino_ban.%d", userId)
			banUntil := time.Now().Add(6 * time.Hour).Unix()
			common.OptionMapRWMutex.Lock()
			common.OptionMap[banKey] = "true"
			common.OptionMapRWMutex.Unlock()
			// 6小时后自动解禁
			go func() {
				time.Sleep(time.Until(time.Unix(banUntil, 0)))
				common.OptionMapRWMutex.Lock()
				delete(common.OptionMap, banKey)
				common.OptionMapRWMutex.Unlock()
			}()
			narrative += "你被傲罗抓住了，被禁止进入赌场6小时！"
			result["banned_until"] = banUntil
		}

		record.Penalty = penalty
		model.RecordLog(userId, model.LogTypeSystem, fmt.Sprintf("古灵阁打劫失败(%s)，损失入场费 %s", cfg.Name, logger.LogQuota(cfg.Fee)))

		detailsMap := map[string]interface{}{
			"narrative":    narrative,
			"success_rate": fmt.Sprintf("%.1f%%", successRate*100),
			"penalty":      penalty,
		}
		detailsJSON, _ := common.Marshal(detailsMap)
		record.Details = string(detailsJSON)

		result["penalty"] = penalty
		result["narrative"] = narrative
	}

	_ = model.CreateHeistRecord(record)
	result["record_id"] = record.Id

	return result, nil
}

// GetHeistHistory 获取打劫历史
func GetHeistHistory(userId int, page, perPage int) ([]model.GringottsHeistRecord, int64, error) {
	return model.GetHeistHistory(userId, page, perPage)
}

// CheckHeistTitles 检查打劫相关称号
func CheckHeistTitles(userId int) {
	successCount := model.GetUserHeistSuccessCount(userId)
	if successCount >= 3 {
		title, _ := model.GetTitleByKey("gringotts_thief")
		if title != nil {
			_ = model.GrantTitle(userId, title.Id)
		}
	}

	imperioCount := model.GetUserImperioSuccessCount(userId)
	if imperioCount >= 1 {
		title, _ := model.GetTitleByKey("dark_lord")
		if title != nil {
			_ = model.GrantTitle(userId, title.Id)
		}
	}
}
