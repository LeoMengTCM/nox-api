package operation_setting

import "github.com/LeoMengTCM/nox-api/setting/config"

// CasinoSetting 赌场系统配置
type CasinoSetting struct {
	Enabled          bool `json:"enabled"`            // 是否启用赌场系统
	MinBet           int  `json:"min_bet"`            // 最小下注额度
	MaxBet           int  `json:"max_bet"`            // 最大下注额度
	DailyLossLimit   int  `json:"daily_loss_limit"`   // 每日最大亏损额度
	BlackjackEnabled bool `json:"blackjack_enabled"`  // 是否启用21点
	DiceEnabled      bool `json:"dice_enabled"`       // 是否启用骰子
	RouletteEnabled  bool `json:"roulette_enabled"`   // 是否启用轮盘
	BaccaratEnabled  bool `json:"baccarat_enabled"`   // 是否启用百家乐
	SlotsEnabled     bool `json:"slots_enabled"`      // 是否启用老虎机
	PokerEnabled     bool `json:"poker_enabled"`      // 是否启用扑克
	// Heist (打劫) settings
	HeistEnabled   bool    `json:"heist_enabled"`    // 是否启用打劫
	SneakFeePct    float64 `json:"sneak_fee_pct"`    // 隐身入场费 = 金库余额 × pct
	SneakMinPct    float64 `json:"sneak_min_pct"`    // 隐身最小奖励百分比
	SneakMaxPct    float64 `json:"sneak_max_pct"`    // 隐身最大奖励百分比
	SneakCooldown  int64   `json:"sneak_cooldown"`   // 隐身冷却秒数
	SneakBaseRate  float64 `json:"sneak_base_rate"`  // 隐身基础成功率
	DragonFeePct   float64 `json:"dragon_fee_pct"`   // 骑龙入场费百分比
	DragonMinPct   float64 `json:"dragon_min_pct"`   // 骑龙最小奖励百分比
	DragonMaxPct   float64 `json:"dragon_max_pct"`   // 骑龙最大奖励百分比
	DragonCooldown int64   `json:"dragon_cooldown"`  // 骑龙冷却秒数
	DragonBaseRate float64 `json:"dragon_base_rate"` // 骑龙基础成功率
	ImperioFeePct    float64 `json:"imperio_fee_pct"`    // 夺魂咒入场费百分比
	ImperioMinPct    float64 `json:"imperio_min_pct"`    // 夺魂咒最小奖励百分比
	ImperioMaxPct    float64 `json:"imperio_max_pct"`    // 夺魂咒最大奖励百分比
	ImperioCooldown  int64   `json:"imperio_cooldown"`   // 夺魂咒冷却秒数
	ImperioBaseRate  float64 `json:"imperio_base_rate"`  // 夺魂咒基础成功率
}

// 默认配置
// 额度单位: 500000 = $1
// MinBet: 5000 ≈ $0.01, MaxBet: 5000000 ≈ $10, DailyLossLimit: 25000000 ≈ $50
var casinoSetting = CasinoSetting{
	Enabled:          false,
	MinBet:           5000,
	MaxBet:           5000000,
	DailyLossLimit:   25000000,
	BlackjackEnabled: true,
	DiceEnabled:      true,
	RouletteEnabled:  true,
	BaccaratEnabled:  true,
	SlotsEnabled:     true,
	PokerEnabled:     true,
	// Heist defaults
	HeistEnabled:   true,
	SneakFeePct:    0.001,
	SneakMinPct:    0.001,
	SneakMaxPct:    0.005,
	SneakCooldown:  14400,
	SneakBaseRate:  0.60,
	DragonFeePct:   0.005,
	DragonMinPct:   0.005,
	DragonMaxPct:   0.02,
	DragonCooldown: 43200,
	DragonBaseRate: 0.35,
	ImperioFeePct:    0.02,
	ImperioMinPct:    0.02,
	ImperioMaxPct:    0.05,
	ImperioCooldown:  86400,
	ImperioBaseRate:  0.15,
}

func init() {
	config.GlobalConfig.Register("casino_setting", &casinoSetting)
}

// GetCasinoSetting 获取赌场配置
func GetCasinoSetting() *CasinoSetting {
	return &casinoSetting
}

// IsCasinoEnabled 是否启用赌场系统
func IsCasinoEnabled() bool {
	return casinoSetting.Enabled
}

// GetMinBet 获取最小下注额度
func GetMinBet() int {
	if casinoSetting.MinBet <= 0 {
		return 5000
	}
	return casinoSetting.MinBet
}

// GetMaxBet 获取最大下注额度
func GetMaxBet() int {
	if casinoSetting.MaxBet <= 0 {
		return 5000000
	}
	return casinoSetting.MaxBet
}

// GetDailyLossLimit 获取每日最大亏损额度
func GetDailyLossLimit() int {
	if casinoSetting.DailyLossLimit <= 0 {
		return 25000000
	}
	return casinoSetting.DailyLossLimit
}

// IsGameEnabled 判断某个游戏是否启用
func IsGameEnabled(gameType string) bool {
	switch gameType {
	case "blackjack":
		return casinoSetting.BlackjackEnabled
	case "dice":
		return casinoSetting.DiceEnabled
	case "roulette":
		return casinoSetting.RouletteEnabled
	case "baccarat":
		return casinoSetting.BaccaratEnabled
	case "slots":
		return casinoSetting.SlotsEnabled
	case "poker":
		return casinoSetting.PokerEnabled
	default:
		return false
	}
}

// IsHeistEnabled 是否启用打劫
func IsHeistEnabled() bool {
	return casinoSetting.HeistEnabled
}

// HeistConfig holds runtime heist parameters for a single type
type HeistConfig struct {
	FeePct   float64
	MinPct   float64
	MaxPct   float64
	Cooldown int64
	BaseRate float64
}

// GetHeistConfig 获取某种打劫方式的配置
func GetHeistConfig(heistType string) (HeistConfig, bool) {
	switch heistType {
	case "sneak":
		return HeistConfig{
			FeePct:   orDefault(casinoSetting.SneakFeePct, 0.001),
			MinPct:   orDefault(casinoSetting.SneakMinPct, 0.001),
			MaxPct:   orDefault(casinoSetting.SneakMaxPct, 0.005),
			Cooldown: orDefaultInt64(casinoSetting.SneakCooldown, 14400),
			BaseRate: orDefault(casinoSetting.SneakBaseRate, 0.60),
		}, true
	case "dragon":
		return HeistConfig{
			FeePct:   orDefault(casinoSetting.DragonFeePct, 0.005),
			MinPct:   orDefault(casinoSetting.DragonMinPct, 0.005),
			MaxPct:   orDefault(casinoSetting.DragonMaxPct, 0.02),
			Cooldown: orDefaultInt64(casinoSetting.DragonCooldown, 43200),
			BaseRate: orDefault(casinoSetting.DragonBaseRate, 0.35),
		}, true
	case "imperio":
		return HeistConfig{
			FeePct:   orDefault(casinoSetting.ImperioFeePct, 0.02),
			MinPct:   orDefault(casinoSetting.ImperioMinPct, 0.02),
			MaxPct:   orDefault(casinoSetting.ImperioMaxPct, 0.05),
			Cooldown: orDefaultInt64(casinoSetting.ImperioCooldown, 86400),
			BaseRate: orDefault(casinoSetting.ImperioBaseRate, 0.15),
		}, true
	default:
		return HeistConfig{}, false
	}
}

// GetAllHeistConfigs 获取所有打劫方式配置
func GetAllHeistConfigs() map[string]HeistConfig {
	result := make(map[string]HeistConfig)
	for _, t := range []string{"sneak", "dragon", "imperio"} {
		cfg, _ := GetHeistConfig(t)
		result[t] = cfg
	}
	return result
}

func orDefault(val, def float64) float64 {
	if val <= 0 {
		return def
	}
	return val
}

func orDefaultInt64(val, def int64) int64 {
	if val <= 0 {
		return def
	}
	return val
}
