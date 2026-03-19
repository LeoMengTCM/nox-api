package operation_setting

import "github.com/LeoMengTCM/nox-api/setting/config"

// BankSetting 古灵阁银行配置
type BankSetting struct {
	Enabled              bool  `json:"enabled"`                  // 是否启用银行系统
	BankPool             int64 `json:"bank_pool"`                // 银行资金池余额 (利息从这里扣)
	DemandRate           int   `json:"demand_rate"`              // 活期年化利率 万分比 (200 = 2%)
	PremiumDemandRate    int   `json:"premium_demand_rate"`      // 高息活期年化利率 万分比 (600 = 6%)
	FixedRate7           int   `json:"fixed_rate_7"`             // 7天定期年化利率 万分比
	FixedRate30          int   `json:"fixed_rate_30"`            // 30天定期年化利率 万分比
	FixedRate90          int   `json:"fixed_rate_90"`            // 90天定期年化利率 万分比
	MinDeposit           int   `json:"min_deposit"`              // 最小存入金额
	MinPremiumDeposit    int   `json:"min_premium_deposit"`      // 高息活期最小存入金额
	MaxDemandBalance     int   `json:"max_demand_balance"`       // 活期最大余额
	MaxPremiumBalance    int   `json:"max_premium_balance"`      // 高息活期最大余额
	MaxFixedPerUser      int   `json:"max_fixed_per_user"`       // 每人最多定期存单数
	EarlyWithdrawPenalty int   `json:"early_withdraw_penalty"`   // 提前取出利息罚没百分比
}

// 默认配置 — 额度单位: 500000 = $1
var bankSetting = BankSetting{
	Enabled:              false,
	BankPool:             0,
	DemandRate:           200,     // 2% 年化
	PremiumDemandRate:    600,     // 6% 年化
	FixedRate7:           500,     // 5% 年化
	FixedRate30:          800,     // 8% 年化
	FixedRate90:          1200,    // 12% 年化
	MinDeposit:           50000,   // $0.10
	MinPremiumDeposit:    500000,  // $1.00
	MaxDemandBalance:     50000000, // $100
	MaxPremiumBalance:    5000000, // $10
	MaxFixedPerUser:      5,
	EarlyWithdrawPenalty: 50, // 50%
}

func init() {
	config.GlobalConfig.Register("bank_setting", &bankSetting)
}

func GetBankSetting() *BankSetting {
	return &bankSetting
}

func IsBankEnabled() bool {
	return bankSetting.Enabled
}

func GetDemandRate() int {
	if bankSetting.DemandRate <= 0 {
		return 200
	}
	return bankSetting.DemandRate
}

func GetPremiumDemandRate() int {
	if bankSetting.PremiumDemandRate <= 0 {
		return 600
	}
	return bankSetting.PremiumDemandRate
}

func GetFixedRate(termDays int) int {
	switch termDays {
	case 7:
		if bankSetting.FixedRate7 <= 0 {
			return 500
		}
		return bankSetting.FixedRate7
	case 30:
		if bankSetting.FixedRate30 <= 0 {
			return 800
		}
		return bankSetting.FixedRate30
	case 90:
		if bankSetting.FixedRate90 <= 0 {
			return 1200
		}
		return bankSetting.FixedRate90
	default:
		return 0
	}
}

func GetMinDeposit() int {
	if bankSetting.MinDeposit <= 0 {
		return 50000
	}
	return bankSetting.MinDeposit
}

func GetMinPremiumDeposit() int {
	if bankSetting.MinPremiumDeposit <= 0 {
		return 500000
	}
	return bankSetting.MinPremiumDeposit
}

func GetMaxDemandBalance() int {
	if bankSetting.MaxDemandBalance <= 0 {
		return 50000000
	}
	return bankSetting.MaxDemandBalance
}

func GetMaxPremiumBalance() int {
	if bankSetting.MaxPremiumBalance <= 0 {
		return 5000000
	}
	return bankSetting.MaxPremiumBalance
}

func GetMaxFixedPerUser() int {
	if bankSetting.MaxFixedPerUser <= 0 {
		return 5
	}
	return bankSetting.MaxFixedPerUser
}

func GetEarlyWithdrawPenalty() int {
	if bankSetting.EarlyWithdrawPenalty <= 0 {
		return 50
	}
	return bankSetting.EarlyWithdrawPenalty
}

func GetBankPool() int64 {
	return bankSetting.BankPool
}

// SetBankPoolMemory updates pool in memory only. Caller must persist via model.UpdateOption.
func SetBankPoolMemory(val int64) {
	bankSetting.BankPool = val
}
