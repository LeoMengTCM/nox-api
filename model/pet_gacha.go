package model

import (
	"errors"
	"time"

	"github.com/LeoMengTCM/nox-api/common"
	"gorm.io/gorm"
)

// GachaPool 扭蛋卡池定义
type GachaPool struct {
	Id              int     `json:"id" gorm:"primaryKey;autoIncrement"`
	Name            string  `json:"name" gorm:"type:varchar(64);not null"`
	Description     string  `json:"description" gorm:"type:varchar(255)"`
	CostPerPull     int     `json:"cost_per_pull" gorm:"default:500"`
	TenPullDiscount float64 `json:"ten_pull_discount" gorm:"default:0.9"`
	Rates           string  `json:"rates" gorm:"type:text"`        // JSON: {"N":0.60,"R":0.25,"SR":0.12,"SSR":0.03}
	PityConfig      string  `json:"pity_config" gorm:"type:text"`  // JSON: {"sr_pity":10,"ssr_pity":80}
	SpeciesPool     string  `json:"species_pool" gorm:"type:text"` // JSON: [{"species_id":1,"rarity":"R","weight":100}]
	Enabled         bool    `json:"enabled" gorm:"default:true"`
	StartTime       int64   `json:"start_time" gorm:"default:0"`
	EndTime         int64   `json:"end_time" gorm:"default:0"`
	CreatedAt       int64   `json:"created_at" gorm:"bigint"`
	UpdatedAt       int64   `json:"updated_at" gorm:"bigint"`
}

func (GachaPool) TableName() string {
	return "gacha_pools"
}

// GachaHistory 扭蛋抽取记录
type GachaHistory struct {
	Id        int    `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId    int    `json:"user_id" gorm:"not null;index:idx_gacha_history_user"`
	PoolId    int    `json:"pool_id" gorm:"not null;index:idx_gacha_history_pool"`
	SpeciesId int    `json:"species_id" gorm:"not null"`
	Rarity    string `json:"rarity" gorm:"type:varchar(8)"`
	IsPity    bool   `json:"is_pity" gorm:"default:false"`
	CreatedAt int64  `json:"created_at" gorm:"bigint"`
}

func (GachaHistory) TableName() string {
	return "gacha_histories"
}

// UserPityCounter 用户保底计数器
type UserPityCounter struct {
	Id         int   `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId     int   `json:"user_id" gorm:"not null;uniqueIndex:idx_user_pool"`
	PoolId     int   `json:"pool_id" gorm:"not null;uniqueIndex:idx_user_pool"`
	SrCounter  int   `json:"sr_counter" gorm:"default:0"`
	SsrCounter int   `json:"ssr_counter" gorm:"default:0"`
	UpdatedAt  int64 `json:"updated_at" gorm:"bigint"`
}

func (UserPityCounter) TableName() string {
	return "user_pity_counters"
}

// ==================== GachaPool CRUD ====================

func GetAllGachaPools(enabledOnly bool) ([]GachaPool, error) {
	var pools []GachaPool
	q := DB.Model(&GachaPool{})
	if enabledOnly {
		q = q.Where("enabled = ?", true)
	}
	err := q.Order("id asc").Find(&pools).Error
	return pools, err
}

func GetActiveGachaPools() ([]GachaPool, error) {
	var pools []GachaPool
	now := time.Now().Unix()
	err := DB.Where("enabled = ? AND (start_time = 0 OR start_time <= ?) AND (end_time = 0 OR end_time >= ?)", true, now, now).
		Order("id asc").Find(&pools).Error
	return pools, err
}

func GetGachaPoolById(id int) (*GachaPool, error) {
	var pool GachaPool
	err := DB.First(&pool, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &pool, nil
}

func CreateGachaPool(pool *GachaPool) error {
	pool.CreatedAt = time.Now().Unix()
	pool.UpdatedAt = time.Now().Unix()
	return DB.Create(pool).Error
}

func UpdateGachaPool(pool *GachaPool) error {
	pool.UpdatedAt = time.Now().Unix()
	return DB.Save(pool).Error
}

func DeleteGachaPool(id int) error {
	return DB.Delete(&GachaPool{}, "id = ?", id).Error
}

// ==================== GachaHistory CRUD ====================

func CreateGachaHistory(history *GachaHistory) error {
	history.CreatedAt = time.Now().Unix()
	return DB.Create(history).Error
}

func CreateGachaHistoryInTx(tx *gorm.DB, history *GachaHistory) error {
	history.CreatedAt = time.Now().Unix()
	return tx.Create(history).Error
}

func GetGachaHistoryByUser(userId int, poolId int, page int, pageSize int) ([]GachaHistory, int64, error) {
	var histories []GachaHistory
	var total int64
	q := DB.Model(&GachaHistory{}).Where("user_id = ?", userId)
	if poolId > 0 {
		q = q.Where("pool_id = ?", poolId)
	}
	err := q.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}
	err = q.Order("id desc").Offset((page - 1) * pageSize).Limit(pageSize).Find(&histories).Error
	return histories, total, err
}

// ==================== UserPityCounter CRUD ====================

func GetUserPityCounter(userId int, poolId int) (*UserPityCounter, error) {
	var counter UserPityCounter
	err := DB.Where("user_id = ? AND pool_id = ?", userId, poolId).First(&counter).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &counter, nil
}

func GetUserPityCounterInTx(tx *gorm.DB, userId int, poolId int) (*UserPityCounter, error) {
	var counter UserPityCounter
	err := tx.Where("user_id = ? AND pool_id = ?", userId, poolId).First(&counter).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &counter, nil
}

func CreateOrUpdatePityCounter(counter *UserPityCounter) error {
	counter.UpdatedAt = time.Now().Unix()
	if counter.Id == 0 {
		return DB.Create(counter).Error
	}
	return DB.Save(counter).Error
}

func CreateOrUpdatePityCounterInTx(tx *gorm.DB, counter *UserPityCounter) error {
	counter.UpdatedAt = time.Now().Unix()
	if counter.Id == 0 {
		return tx.Create(counter).Error
	}
	return tx.Save(counter).Error
}

// ==================== Transaction helpers ====================

func CreateUserPetInTx(tx *gorm.DB, pet *UserPet) error {
	pet.CreatedAt = time.Now().Unix()
	pet.UpdatedAt = time.Now().Unix()
	return tx.Create(pet).Error
}

func DeleteUserPetInTx(tx *gorm.DB, userId int, petId int) error {
	result := tx.Where("id = ? AND user_id = ?", petId, userId).Delete(&UserPet{})
	if result.RowsAffected == 0 {
		return errors.New("宠物不存在或无权限")
	}
	return result.Error
}

// SeedGachaData populates the initial gacha pool if the gacha_pools table is empty.
// This function is idempotent.
func SeedGachaData() {
	var count int64
	DB.Model(&GachaPool{}).Count(&count)
	if count > 0 {
		return
	}

	common.SysLog("seeding initial gacha pool...")
	now := time.Now().Unix()

	// Fetch non-starter, enabled species to build the gacha pool
	// (starters are free — they should not appear in the paid gacha pool)
	var allSpecies []PetSpecies
	if err := DB.Where("is_starter = ? AND enabled = ?", false, true).Find(&allSpecies).Error; err != nil {
		common.SysError("failed to query species for gacha seed: " + err.Error())
		return
	}
	if len(allSpecies) == 0 {
		common.SysLog("no species found, skipping gacha seed")
		return
	}

	type speciesPoolEntry struct {
		SpeciesId int    `json:"species_id"`
		Rarity    string `json:"rarity"`
		Weight    int    `json:"weight"`
	}
	var pool []speciesPoolEntry
	for _, sp := range allSpecies {
		pool = append(pool, speciesPoolEntry{
			SpeciesId: sp.Id,
			Rarity:    sp.Rarity,
			Weight:    100,
		})
	}

	speciesPoolJSON := mustMarshal(pool)
	ratesJSON := mustMarshal(map[string]float64{
		"N": 0.60, "R": 0.30, "SR": 0.08, "SSR": 0.02,
	})
	pityJSON := mustMarshal(map[string]int{
		"sr_pity": 10, "ssr_pity": 80,
	})

	gachaPool := GachaPool{
		Name:            "基础召唤",
		Description:     "包含所有常驻宠物的基础卡池",
		CostPerPull:     500000,
		TenPullDiscount: 0.9,
		Rates:           ratesJSON,
		PityConfig:      pityJSON,
		SpeciesPool:     speciesPoolJSON,
		Enabled:         true,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	if err := DB.Create(&gachaPool).Error; err != nil {
		common.SysError("failed to seed gacha pool: " + err.Error())
		return
	}

	common.SysLog("gacha pool seeded successfully")
}
