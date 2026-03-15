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
