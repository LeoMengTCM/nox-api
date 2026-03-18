package operation_setting

import "github.com/LeoMengTCM/nox-api/setting/config"

// PetSetting 宠物系统配置
type PetSetting struct {
	Enabled        bool `json:"enabled"`           // 是否启用宠物系统
	MaxPetsPerUser int  `json:"max_pets_per_user"` // 每个用户最多拥有的宠物数

	// 互动参数
	PlayCooldownMinutes int `json:"play_cooldown_minutes"` // 玩耍冷却分钟数
	CleanDailyLimit     int `json:"clean_daily_limit"`     // 每日清洁次数上限
	CleanBoost          int `json:"clean_boost"`           // 清洁增量
	PlayMoodBoost       int `json:"play_mood_boost"`       // 玩耍心情增量

	// EXP 奖励
	FeedExp  int `json:"feed_exp"`  // 喂食获得 EXP
	PlayExp  int `json:"play_exp"`  // 玩耍获得 EXP
	CleanExp int `json:"clean_exp"` // 清洁获得 EXP

	// 状态衰减（每小时）
	HungerDecayPerHour      int `json:"hunger_decay_per_hour"`      // 饥饿衰减/h
	MoodDecayPerHour        int `json:"mood_decay_per_hour"`        // 心情衰减/h
	CleanlinessDecayPerHour int `json:"cleanliness_decay_per_hour"` // 洁净衰减/h

	// 自然增长
	PassiveXpPerHour int `json:"passive_xp_per_hour"` // 挂机每小时自然获得的 XP

	// 升级进化
	LevelExpMultiplier   int `json:"level_exp_multiplier"`   // 升级公式倍数
	EvolutionStage1Level int `json:"evolution_stage1_level"` // 一阶进化等级
	EvolutionStage2Level int `json:"evolution_stage2_level"` // 二阶进化等级
	MaxLevel             int `json:"max_level"`              // 最大等级

	// 孵化
	HatchDurationMinutes int `json:"hatch_duration_minutes"` // 孵化时长（分钟）

	// 融合
	FusionBaseCost int `json:"fusion_base_cost"` // 融合基础费用
	MaxStar        int `json:"max_star"`         // 最大星级

	// 市场
	MarketFeeRate       float64 `json:"market_fee_rate"`       // 手续费率 (0.05 = 5%)
	AuctionBidIncrement float64 `json:"auction_bid_increment"` // 竞拍最低加价率 (0.05 = 5%)

	// 竞技场
	ArenaEnabled       bool `json:"arena_enabled"`         // 是否启用竞技场
	ArenaAttacksPerDay int  `json:"arena_attacks_per_day"` // 每日攻擂次数上限
	ArenaSeasonDays    int  `json:"arena_season_days"`     // 赛季天数
}

// 默认配置
var petSetting = PetSetting{
	Enabled:                 false,
	MaxPetsPerUser:          20,
	PlayCooldownMinutes:     5,
	CleanDailyLimit:         3,
	CleanBoost:              20,
	PlayMoodBoost:           10,
	FeedExp:                 15,
	PlayExp:                 10,
	CleanExp:                5,
	HungerDecayPerHour:      4,
	MoodDecayPerHour:        3,
	CleanlinessDecayPerHour: 2,
	PassiveXpPerHour:        5,
	LevelExpMultiplier:      100,
	EvolutionStage1Level:    10,
	EvolutionStage2Level:    30,
	MaxLevel:                100,
	HatchDurationMinutes:    30,
	FusionBaseCost:          200000,
	MaxStar:                 5,
	MarketFeeRate:           0.05,
	AuctionBidIncrement:     0.05,
	ArenaEnabled:            false,
	ArenaAttacksPerDay:      5,
	ArenaSeasonDays:         30,
}

func init() {
	config.GlobalConfig.Register("pet_setting", &petSetting)
}

// GetPetSetting 获取宠物配置
func GetPetSetting() *PetSetting {
	return &petSetting
}

// IsPetEnabled 是否启用宠物系统
func IsPetEnabled() bool {
	return petSetting.Enabled
}

// GetMaxPetsPerUser 获取每用户最大宠物数
func GetMaxPetsPerUser() int {
	return petSetting.MaxPetsPerUser
}

// ── 互动参数 ──

func GetPlayCooldownMinutes() int {
	if petSetting.PlayCooldownMinutes <= 0 {
		return 5
	}
	return petSetting.PlayCooldownMinutes
}

func GetCleanDailyLimit() int {
	if petSetting.CleanDailyLimit <= 0 {
		return 3
	}
	return petSetting.CleanDailyLimit
}

func GetCleanBoost() int {
	if petSetting.CleanBoost <= 0 {
		return 20
	}
	return petSetting.CleanBoost
}

func GetPlayMoodBoost() int {
	if petSetting.PlayMoodBoost <= 0 {
		return 10
	}
	return petSetting.PlayMoodBoost
}

// ── EXP 奖励 ──

func GetFeedExp() int {
	if petSetting.FeedExp <= 0 {
		return 15
	}
	return petSetting.FeedExp
}

func GetPlayExp() int {
	if petSetting.PlayExp <= 0 {
		return 10
	}
	return petSetting.PlayExp
}

func GetCleanExp() int {
	if petSetting.CleanExp <= 0 {
		return 5
	}
	return petSetting.CleanExp
}

// ── 状态衰减 ──

func GetHungerDecayPerHour() int {
	if petSetting.HungerDecayPerHour <= 0 {
		return 4
	}
	return petSetting.HungerDecayPerHour
}

func GetMoodDecayPerHour() int {
	if petSetting.MoodDecayPerHour <= 0 {
		return 3
	}
	return petSetting.MoodDecayPerHour
}

func GetCleanlinessDecayPerHour() int {
	if petSetting.CleanlinessDecayPerHour <= 0 {
		return 2
	}
	return petSetting.CleanlinessDecayPerHour
}

func GetPassiveXpPerHour() int {
	if petSetting.PassiveXpPerHour <= 0 {
		return 5
	}
	return petSetting.PassiveXpPerHour
}

// ── 升级进化 ──

func GetLevelExpMultiplier() int {
	if petSetting.LevelExpMultiplier <= 0 {
		return 100
	}
	return petSetting.LevelExpMultiplier
}

func GetEvolutionStage1Level() int {
	if petSetting.EvolutionStage1Level <= 0 {
		return 10
	}
	return petSetting.EvolutionStage1Level
}

func GetEvolutionStage2Level() int {
	if petSetting.EvolutionStage2Level <= 0 {
		return 30
	}
	return petSetting.EvolutionStage2Level
}

func GetMaxLevel() int {
	if petSetting.MaxLevel <= 0 {
		return 100
	}
	return petSetting.MaxLevel
}

// ── 孵化 ──

func GetHatchDurationMinutes() int {
	if petSetting.HatchDurationMinutes <= 0 {
		return 30
	}
	return petSetting.HatchDurationMinutes
}

// ── 融合 ──

func GetFusionBaseCost() int {
	if petSetting.FusionBaseCost <= 0 {
		return 200000
	}
	return petSetting.FusionBaseCost
}

func GetMaxStar() int {
	if petSetting.MaxStar <= 0 {
		return 5
	}
	return petSetting.MaxStar
}

// ── 市场 ──

func GetMarketFeeRate() float64 {
	if petSetting.MarketFeeRate <= 0 {
		return 0.05
	}
	return petSetting.MarketFeeRate
}

func GetAuctionBidIncrement() float64 {
	if petSetting.AuctionBidIncrement <= 0 {
		return 0.05
	}
	return petSetting.AuctionBidIncrement
}

// ── 竞技场 ──

func IsArenaEnabled() bool {
	return petSetting.ArenaEnabled
}

func GetArenaAttacksPerDay() int {
	if petSetting.ArenaAttacksPerDay <= 0 {
		return 5
	}
	return petSetting.ArenaAttacksPerDay
}

func GetArenaSeasonDays() int {
	if petSetting.ArenaSeasonDays <= 0 {
		return 30
	}
	return petSetting.ArenaSeasonDays
}
