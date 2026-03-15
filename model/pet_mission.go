package model

import (
	"time"

	"github.com/LeoMengTCM/nox-api/common"
)

// PetMission 任务定义
type PetMission struct {
	Id            int    `json:"id" gorm:"primaryKey;autoIncrement"`
	Name          string `json:"name" gorm:"type:varchar(64);not null"`
	Description   string `json:"description" gorm:"type:varchar(255)"`
	Duration      int    `json:"duration" gorm:"default:3600"`        // seconds
	Difficulty    int    `json:"difficulty" gorm:"default:1"`         // 1-5
	RequiredLevel int    `json:"required_level" gorm:"default:1"`
	StatWeights   string `json:"stat_weights" gorm:"type:text"`      // JSON: {"attack":0.3,"speed":0.5,"luck":0.2}
	Rewards       string `json:"rewards" gorm:"type:text"`           // JSON: [{"type":"quota","amount":100,"probability":1.0},{"type":"item","id":1,"amount":1,"probability":0.5}]
	MaxDaily      int    `json:"max_daily" gorm:"default:3"`
	Enabled       bool   `json:"enabled" gorm:"default:true"`
	CreatedAt     int64  `json:"created_at" gorm:"bigint"`
	UpdatedAt     int64  `json:"updated_at" gorm:"bigint"`
}

func (PetMission) TableName() string {
	return "pet_missions"
}

// PetDispatch 派遣记录
type PetDispatch struct {
	Id          int    `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId      int    `json:"user_id" gorm:"not null;index:idx_pet_dispatch_user"`
	PetId       int    `json:"pet_id" gorm:"not null"`
	MissionId   int    `json:"mission_id" gorm:"not null"`
	StartedAt   int64  `json:"started_at" gorm:"bigint"`
	EndsAt      int64  `json:"ends_at" gorm:"bigint"`
	Status      string `json:"status" gorm:"type:varchar(16);default:'in_progress'"` // in_progress, completed, collected
	Success     bool   `json:"success" gorm:"default:false"`
	RewardsData string `json:"rewards_data" gorm:"type:text"` // JSON: actual rewards received
	CreatedAt   int64  `json:"created_at" gorm:"bigint"`
}

func (PetDispatch) TableName() string {
	return "pet_dispatches"
}

// PetActivity 宠物动态
type PetActivity struct {
	Id           int    `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId       int    `json:"user_id" gorm:"not null;index:idx_pet_activity_user"`
	PetId        int    `json:"pet_id" gorm:"not null"`
	ActivityType string `json:"activity_type" gorm:"type:varchar(32);not null"` // hatched, evolved, star_up, ssr_pulled, mission_complete
	Data         string `json:"data" gorm:"type:text"`                          // JSON: activity details
	CreatedAt    int64  `json:"created_at" gorm:"bigint"`
}

func (PetActivity) TableName() string {
	return "pet_activities"
}

// ==================== PetMission CRUD ====================

func GetAllMissions(enabledOnly bool) ([]PetMission, error) {
	var missions []PetMission
	q := DB.Model(&PetMission{})
	if enabledOnly {
		q = q.Where("enabled = ?", true)
	}
	err := q.Order("id asc").Find(&missions).Error
	return missions, err
}

func GetMissionById(id int) (*PetMission, error) {
	var mission PetMission
	err := DB.First(&mission, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &mission, nil
}

func CreateMission(mission *PetMission) error {
	mission.CreatedAt = time.Now().Unix()
	mission.UpdatedAt = time.Now().Unix()
	return DB.Create(mission).Error
}

func UpdateMission(mission *PetMission) error {
	mission.UpdatedAt = time.Now().Unix()
	return DB.Save(mission).Error
}

func DeleteMission(id int) error {
	return DB.Delete(&PetMission{}, "id = ?", id).Error
}

// ==================== PetDispatch CRUD ====================

func CreateDispatch(dispatch *PetDispatch) error {
	dispatch.CreatedAt = time.Now().Unix()
	return DB.Create(dispatch).Error
}

func GetActiveDispatches(userId int) ([]PetDispatch, error) {
	var dispatches []PetDispatch
	err := DB.Where("user_id = ? AND status != ?", userId, "collected").
		Order("created_at desc").Find(&dispatches).Error
	return dispatches, err
}

func GetDispatchById(id int) (*PetDispatch, error) {
	var dispatch PetDispatch
	err := DB.First(&dispatch, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &dispatch, nil
}

func UpdateDispatch(dispatch *PetDispatch) error {
	return DB.Save(dispatch).Error
}

func GetDispatchHistory(userId int, page int, pageSize int) ([]PetDispatch, int64, error) {
	var dispatches []PetDispatch
	var total int64
	q := DB.Model(&PetDispatch{}).Where("user_id = ?", userId)
	err := q.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}
	err = q.Order("id desc").Offset((page - 1) * pageSize).Limit(pageSize).Find(&dispatches).Error
	return dispatches, total, err
}

func GetTodayDispatchCount(userId int, missionId int) (int64, error) {
	var count int64
	now := time.Now().UTC()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	err := DB.Model(&PetDispatch{}).
		Where("user_id = ? AND mission_id = ? AND created_at >= ?", userId, missionId, startOfDay.Unix()).
		Count(&count).Error
	return count, err
}

// GetInProgressDispatchesEndedBefore returns in_progress dispatches that have ended
func GetInProgressDispatchesEndedBefore(userId int, now int64) ([]PetDispatch, error) {
	var dispatches []PetDispatch
	err := DB.Where("user_id = ? AND status = ? AND ends_at <= ?", userId, "in_progress", now).
		Find(&dispatches).Error
	return dispatches, err
}

// ==================== PetActivity CRUD ====================

func CreateActivity(activity *PetActivity) error {
	activity.CreatedAt = time.Now().Unix()
	return DB.Create(activity).Error
}

func GetUserActivities(userId int, page int, pageSize int) ([]PetActivity, int64, error) {
	var activities []PetActivity
	var total int64
	q := DB.Model(&PetActivity{}).Where("user_id = ?", userId)
	err := q.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}
	err = q.Order("id desc").Offset((page - 1) * pageSize).Limit(pageSize).Find(&activities).Error
	return activities, total, err
}

func GetRecentActivities(limit int) ([]PetActivity, error) {
	var activities []PetActivity
	err := DB.Order("id desc").Limit(limit).Find(&activities).Error
	return activities, err
}

// ==================== Additional UserPet helpers ====================

// GetUserPetsByUserId is an alias for GetUserPets for public access
func GetUserPetsByUserId(userId int) ([]UserPet, error) {
	return GetUserPets(userId)
}

// PetStatsResult holds aggregated pet stats for a user
type PetStatsResult struct {
	PetCount   int `json:"pet_count"`
	MaxLevel   int `json:"max_level"`
	TotalStars int `json:"total_stars"`
}

// GetUserPetStats returns aggregated pet statistics for a user
func GetUserPetStats(userId int) (*PetStatsResult, error) {
	var result PetStatsResult
	err := DB.Model(&UserPet{}).
		Where("user_id = ?", userId).
		Select("COUNT(*) as pet_count, COALESCE(MAX(level), 0) as max_level, COALESCE(SUM(star), 0) as total_stars").
		Scan(&result).Error
	if err != nil {
		return nil, err
	}
	return &result, nil
}

// SeedMissionData populates the initial missions if the pet_missions table is empty.
// This function is idempotent.
func SeedMissionData() {
	var count int64
	DB.Model(&PetMission{}).Count(&count)
	if count > 0 {
		return
	}

	common.SysLog("seeding initial pet missions...")
	now := time.Now().Unix()

	type reward struct {
		Type        string  `json:"type"`
		Amount      int     `json:"amount"`
		Probability float64 `json:"probability"`
	}

	missions := []PetMission{
		{
			Name:          "森林探索",
			Description:   "探索附近的森林，寻找隐藏的宝藏",
			Duration:      1800,
			Difficulty:    1,
			RequiredLevel: 1,
			MaxDaily:      5,
			Enabled:       true,
			StatWeights: mustMarshal(map[string]float64{
				"speed": 0.5, "luck": 0.5,
			}),
			Rewards: mustMarshal([]reward{
				{Type: "quota", Amount: 200000, Probability: 1.0},
				{Type: "exp", Amount: 30, Probability: 1.0},
			}),
			CreatedAt: now,
			UpdatedAt: now,
		},
		{
			Name:          "矿洞冒险",
			Description:   "深入黑暗的矿洞，挖掘珍贵的矿石",
			Duration:      3600,
			Difficulty:    2,
			RequiredLevel: 5,
			MaxDaily:      3,
			Enabled:       true,
			StatWeights: mustMarshal(map[string]float64{
				"attack": 0.4, "defense": 0.4, "luck": 0.2,
			}),
			Rewards: mustMarshal([]reward{
				{Type: "quota", Amount: 500000, Probability: 1.0},
				{Type: "exp", Amount: 80, Probability: 1.0},
			}),
			CreatedAt: now,
			UpdatedAt: now,
		},
		{
			Name:          "古塔探秘",
			Description:   "攀登神秘的古塔，揭开尘封的秘密",
			Duration:      7200,
			Difficulty:    3,
			RequiredLevel: 10,
			MaxDaily:      2,
			Enabled:       true,
			StatWeights: mustMarshal(map[string]float64{
				"attack": 0.3, "defense": 0.3, "speed": 0.2, "luck": 0.2,
			}),
			Rewards: mustMarshal([]reward{
				{Type: "quota", Amount: 1000000, Probability: 1.0},
				{Type: "exp", Amount: 150, Probability: 1.0},
			}),
			CreatedAt: now,
			UpdatedAt: now,
		},
		{
			Name:          "深海远征",
			Description:   "潜入深海探索沉没的遗迹",
			Duration:      14400,
			Difficulty:    4,
			RequiredLevel: 20,
			MaxDaily:      1,
			Enabled:       true,
			StatWeights: mustMarshal(map[string]float64{
				"defense": 0.4, "speed": 0.3, "luck": 0.3,
			}),
			Rewards: mustMarshal([]reward{
				{Type: "quota", Amount: 2500000, Probability: 1.0},
				{Type: "exp", Amount: 300, Probability: 1.0},
			}),
			CreatedAt: now,
			UpdatedAt: now,
		},
		{
			Name:          "龙巢突袭",
			Description:   "挑战传说中的龙巢，只有最强的宠物才能胜出",
			Duration:      28800,
			Difficulty:    5,
			RequiredLevel: 30,
			MaxDaily:      1,
			Enabled:       true,
			StatWeights: mustMarshal(map[string]float64{
				"attack": 0.4, "defense": 0.3, "speed": 0.2, "luck": 0.1,
			}),
			Rewards: mustMarshal([]reward{
				{Type: "quota", Amount: 5000000, Probability: 1.0},
				{Type: "exp", Amount: 500, Probability: 1.0},
			}),
			CreatedAt: now,
			UpdatedAt: now,
		},
	}

	for i := range missions {
		if err := DB.Create(&missions[i]).Error; err != nil {
			common.SysError("failed to seed pet mission: " + err.Error())
			return
		}
	}

	common.SysLog("pet missions seeded successfully")
}
