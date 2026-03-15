package service

import (
	"errors"
	"math"
	"math/rand"
	"time"

	"github.com/LeoMengTCM/nox-api/common"
	"github.com/LeoMengTCM/nox-api/model"
	"github.com/LeoMengTCM/nox-api/setting/operation_setting"

	"gorm.io/gorm"
)

// SpeciesPoolEntry represents one entry in a gacha pool's species list
type SpeciesPoolEntry struct {
	SpeciesId int    `json:"species_id"`
	Rarity    string `json:"rarity"`
	Weight    int    `json:"weight"`
}

// PityConfig holds pity thresholds
type PityConfig struct {
	SrPity  int `json:"sr_pity"`
	SsrPity int `json:"ssr_pity"`
}

// pullResult is an internal struct for a single pull outcome
type pullResult struct {
	SpeciesId int
	Rarity    string
	IsPity    bool
}

// GachaPull performs gacha pulls for a user
func GachaPull(userId, poolId, count int) ([]map[string]interface{}, error) {
	if !operation_setting.IsPetEnabled() {
		return nil, errors.New("宠物系统未启用")
	}
	if count != 1 && count != 10 {
		return nil, errors.New("抽取次数只能为 1 或 10")
	}

	// Get pool and validate
	pool, err := model.GetGachaPoolById(poolId)
	if err != nil {
		return nil, errors.New("卡池不存在")
	}
	if !pool.Enabled {
		return nil, errors.New("卡池未启用")
	}
	now := time.Now().Unix()
	if pool.StartTime > 0 && now < pool.StartTime {
		return nil, errors.New("卡池尚未开放")
	}
	if pool.EndTime > 0 && now > pool.EndTime {
		return nil, errors.New("卡池已结束")
	}

	// Check pet count limit
	currentCount, err := model.GetUserPetCount(userId)
	if err != nil {
		return nil, errors.New("获取宠物数量失败")
	}
	maxPets := operation_setting.GetMaxPetsPerUser()
	if int(currentCount)+count > maxPets {
		return nil, errors.New("宠物数量已达上限")
	}

	// Calculate cost
	var totalCost int
	if count == 1 {
		totalCost = pool.CostPerPull
	} else {
		totalCost = int(math.Round(float64(pool.CostPerPull) * 10 * pool.TenPullDiscount))
	}

	// Parse pool configuration (before transaction — these are read-only checks)
	var rates map[string]float64
	if err := common.Unmarshal([]byte(pool.Rates), &rates); err != nil {
		return nil, errors.New("卡池配置异常")
	}

	var pityConfig PityConfig
	if pool.PityConfig != "" {
		_ = common.Unmarshal([]byte(pool.PityConfig), &pityConfig)
	}

	var speciesPool []SpeciesPoolEntry
	if err := common.Unmarshal([]byte(pool.SpeciesPool), &speciesPool); err != nil {
		return nil, errors.New("卡池物种配置异常")
	}

	// Group species by rarity
	speciesByRarity := make(map[string][]SpeciesPoolEntry)
	for _, sp := range speciesPool {
		speciesByRarity[sp.Rarity] = append(speciesByRarity[sp.Rarity], sp)
	}

	// Perform pulls and create pets in a single transaction (pity counter read + write atomically)
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	var output []map[string]interface{}

	err = model.DB.Transaction(func(tx *gorm.DB) error {
		// Atomically check and deduct quota inside the transaction
		result := tx.Model(&model.User{}).Where("id = ? AND quota >= ?", userId, totalCost).Update("quota", gorm.Expr("quota - ?", totalCost))
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return errors.New("额度不足")
		}

		// Read pity counter inside the transaction to avoid race conditions
		counter, counterErr := model.GetUserPityCounterInTx(tx, userId, poolId)
		if counterErr != nil {
			return counterErr
		}
		if counter == nil {
			counter = &model.UserPityCounter{
				UserId:     userId,
				PoolId:     poolId,
				SrCounter:  0,
				SsrCounter: 0,
			}
		}

		results := make([]pullResult, 0, count)

		for i := 0; i < count; i++ {
			counter.SrCounter++
			counter.SsrCounter++

			var rarity string
			isPity := false

			// Check SSR pity
			if pityConfig.SsrPity > 0 && counter.SsrCounter >= pityConfig.SsrPity {
				rarity = "SSR"
				isPity = true
			} else if pityConfig.SrPity > 0 && counter.SrCounter >= pityConfig.SrPity {
				// Check SR pity — force SR or above
				roll := rng.Float64()
				ssrRate := rates["SSR"]
				if roll < ssrRate {
					rarity = "SSR"
				} else {
					rarity = "SR"
				}
				isPity = true
			} else {
				// Normal probability roll
				rarity = rollRarity(rng, rates)
			}

			// Reset counters on trigger
			if rarity == "SSR" {
				counter.SsrCounter = 0
				counter.SrCounter = 0
			} else if rarity == "SR" {
				counter.SrCounter = 0
			}

			// Pick species by weight within rarity
			speciesId := pickSpeciesByWeight(rng, speciesByRarity[rarity])
			if speciesId == 0 {
				// Fallback: if no species in this rarity, pick from any
				for _, sp := range speciesPool {
					speciesId = sp.SpeciesId
					break
				}
			}

			results = append(results, pullResult{
				SpeciesId: speciesId,
				Rarity:    rarity,
				IsPity:    isPity,
			})
		}

		// Ten-pull guarantee: at least 1 R or above
		if count == 10 {
			hasRPlus := false
			for _, r := range results {
				if r.Rarity == "R" || r.Rarity == "SR" || r.Rarity == "SSR" {
					hasRPlus = true
					break
				}
			}
			if !hasRPlus {
				rSpecies := pickSpeciesByWeight(rng, speciesByRarity["R"])
				if rSpecies > 0 {
					results[9] = pullResult{
						SpeciesId: rSpecies,
						Rarity:    "R",
						IsPity:    true,
					}
				}
			}
		}

		// Create pets + history
		for _, r := range results {
			pet := &model.UserPet{
				UserId:    userId,
				SpeciesId: r.SpeciesId,
				Level:     1,
				Exp:       0,
				Stage:     0,
				Star:      0,
				Status:    defaultPetStatus(),
				State:     "normal",
			}

			// Get species for nickname and base stats
			species, _ := model.GetSpeciesById(r.SpeciesId)
			if species != nil {
				pet.Nickname = species.Name
				pet.Stats = species.BaseStats
			}

			hatchAt := time.Now().Add(time.Duration(operation_setting.GetHatchDurationMinutes()) * time.Minute)
			pet.HatchedAt = &hatchAt

			if err := model.CreateUserPetInTx(tx, pet); err != nil {
				return err
			}

			history := &model.GachaHistory{
				UserId:    userId,
				PoolId:    poolId,
				SpeciesId: r.SpeciesId,
				Rarity:    r.Rarity,
				IsPity:    r.IsPity,
			}
			if err := model.CreateGachaHistoryInTx(tx, history); err != nil {
				return err
			}

			entry := map[string]interface{}{
				"pet":     pet,
				"rarity":  r.Rarity,
				"is_pity": r.IsPity,
			}
			if species != nil {
				entry["species"] = species
				entry["visual_key"] = species.VisualKey
				entry["species_name"] = species.Name
			}
			output = append(output, entry)
		}

		// Save pity counter
		if err := model.CreateOrUpdatePityCounterInTx(tx, counter); err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return nil, errors.New("抽取失败: " + err.Error())
	}

	return output, nil
}

// rollRarity picks a rarity based on weighted probabilities
func rollRarity(rng *rand.Rand, rates map[string]float64) string {
	roll := rng.Float64()
	cumulative := 0.0

	// Order: SSR -> SR -> R -> N (from rarest to most common)
	rarities := []string{"SSR", "SR", "R", "N"}
	for _, r := range rarities {
		if rate, ok := rates[r]; ok {
			cumulative += rate
			if roll < cumulative {
				return r
			}
		}
	}
	return "N"
}

// pickSpeciesByWeight selects a species from a list using weighted random
func pickSpeciesByWeight(rng *rand.Rand, entries []SpeciesPoolEntry) int {
	if len(entries) == 0 {
		return 0
	}
	totalWeight := 0
	for _, e := range entries {
		totalWeight += e.Weight
	}
	if totalWeight <= 0 {
		return entries[0].SpeciesId
	}

	roll := rng.Intn(totalWeight)
	cumulative := 0
	for _, e := range entries {
		cumulative += e.Weight
		if roll < cumulative {
			return e.SpeciesId
		}
	}
	return entries[len(entries)-1].SpeciesId
}

// FusePet fuses a material pet into a main pet to increase its star level
func FusePet(userId, petId, materialPetId int) (map[string]interface{}, error) {
	if !operation_setting.IsPetEnabled() {
		return nil, errors.New("宠物系统未启用")
	}

	if petId == materialPetId {
		return nil, errors.New("不能将宠物与自身融合")
	}

	// Get both pets
	pet, err := model.GetUserPetById(userId, petId)
	if err != nil {
		return nil, errors.New("主宠物不存在")
	}
	material, err := model.GetUserPetById(userId, materialPetId)
	if err != nil {
		return nil, errors.New("材料宠物不存在")
	}

	// Validate same species
	if pet.SpeciesId != material.SpeciesId {
		return nil, errors.New("融合需要同种宠物")
	}

	// Check star limit
	if pet.Star >= operation_setting.GetMaxStar() {
		return nil, errors.New("宠物星级已满")
	}

	// Material cannot be primary
	if material.IsPrimary {
		return nil, errors.New("展示宠物不能作为材料")
	}

	// Neither can be dispatched or listed
	if pet.State == "dispatched" || pet.State == "listed" {
		return nil, errors.New("主宠物当前状态无法融合")
	}
	if material.State == "dispatched" || material.State == "listed" {
		return nil, errors.New("材料宠物当前状态无法融合")
	}

	// Quota cost: (star+1) * baseCost — actual deduction happens inside the transaction
	cost := (pet.Star + 1) * operation_setting.GetFusionBaseCost()

	// Record stats before fusion
	statsBefore := pet.Stats

	// Perform fusion in transaction
	err = model.DB.Transaction(func(tx *gorm.DB) error {
		// Atomically check and deduct quota inside the transaction
		result := tx.Model(&model.User{}).Where("id = ? AND quota >= ?", userId, cost).Update("quota", gorm.Expr("quota - ?", cost))
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return errors.New("额度不足")
		}

		// Increase star
		pet.Star++

		// Recompute stats with star bonus (+10% per star)
		species, specErr := model.GetSpeciesById(pet.SpeciesId)
		if specErr == nil && species != nil {
			recomputeStats(pet, species)
		}

		pet.UpdatedAt = time.Now().Unix()
		if err := tx.Save(pet).Error; err != nil {
			return err
		}

		// Delete material pet
		if err := model.DeleteUserPetInTx(tx, userId, materialPetId); err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return nil, errors.New("融合失败: " + err.Error())
	}

	return map[string]interface{}{
		"pet":          pet,
		"stats_before": statsBefore,
		"stats_after":  pet.Stats,
		"star":         pet.Star,
		"cost":         cost,
	}, nil
}

// nextRarity returns the rarity one tier above, or "" if already max.
func nextRarity(rarity string) string {
	switch rarity {
	case "N":
		return "R"
	case "R":
		return "SR"
	case "SR":
		return "SSR"
	default:
		return ""
	}
}

// rarityStatMultiplier returns the stat multiplier when upgrading rarity.
func rarityStatMultiplier(from string) float64 {
	switch from {
	case "N":
		return 1.4
	case "R":
		return 1.3
	case "SR":
		return 1.35
	default:
		return 1.0
	}
}

// TranscendPet transcends two max-star same-species pets into a higher rarity.
func TranscendPet(userId, petId, materialPetId int) (map[string]interface{}, error) {
	if !operation_setting.IsPetEnabled() {
		return nil, errors.New("宠物系统未启用")
	}

	if petId == materialPetId {
		return nil, errors.New("不能将宠物与自身超越")
	}

	maxStar := operation_setting.GetMaxStar()

	// Get both pets
	pet, err := model.GetUserPetById(userId, petId)
	if err != nil {
		return nil, errors.New("主宠物不存在")
	}
	material, err := model.GetUserPetById(userId, materialPetId)
	if err != nil {
		return nil, errors.New("材料宠物不存在")
	}

	// Validate same species
	if pet.SpeciesId != material.SpeciesId {
		return nil, errors.New("超越需要同种宠物")
	}

	// Determine effective rarity for both
	species, err := model.GetSpeciesById(pet.SpeciesId)
	if err != nil {
		return nil, errors.New("物种信息不存在")
	}
	petRarity := pet.Rarity
	if petRarity == "" {
		petRarity = species.Rarity
	}
	matRarity := material.Rarity
	if matRarity == "" {
		matRarity = species.Rarity
	}

	// Both must be same rarity
	if petRarity != matRarity {
		return nil, errors.New("超越需要相同稀有度的宠物")
	}

	// Both must be max star
	if pet.Star < maxStar {
		return nil, errors.New("主宠物星级未满")
	}
	if material.Star < maxStar {
		return nil, errors.New("材料宠物星级未满")
	}

	// Cannot transcend SSR
	if petRarity == "SSR" {
		return nil, errors.New("SSR 已是最高稀有度，无法超越")
	}

	newRarity := nextRarity(petRarity)
	if newRarity == "" {
		return nil, errors.New("无法确定新稀有度")
	}

	// Material cannot be primary
	if material.IsPrimary {
		return nil, errors.New("展示宠物不能作为材料")
	}

	// Neither can be dispatched or listed
	if pet.State == "dispatched" || pet.State == "listed" {
		return nil, errors.New("主宠物当前状态无法超越")
	}
	if material.State == "dispatched" || material.State == "listed" {
		return nil, errors.New("材料宠物当前状态无法超越")
	}

	// Cost: (maxStar + 1) * fusionBaseCost * 3
	cost := (maxStar + 1) * operation_setting.GetFusionBaseCost() * 3

	// Keep higher level
	newLevel := pet.Level
	if material.Level > newLevel {
		newLevel = material.Level
	}

	statsBefore := pet.Stats
	rarityBefore := petRarity

	err = model.DB.Transaction(func(tx *gorm.DB) error {
		// Deduct quota
		result := tx.Model(&model.User{}).Where("id = ? AND quota >= ?", userId, cost).Update("quota", gorm.Expr("quota - ?", cost))
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return errors.New("额度不足")
		}

		// Upgrade rarity, reset star, keep higher level
		pet.Rarity = newRarity
		pet.Star = 0
		pet.Level = newLevel

		// Recompute stats: apply rarity multiplier to current base stats
		recomputeStatsWithRarity(pet, species, newRarity)

		pet.UpdatedAt = time.Now().Unix()
		if err := tx.Save(pet).Error; err != nil {
			return err
		}

		// Delete material pet
		if err := model.DeleteUserPetInTx(tx, userId, materialPetId); err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return nil, errors.New("超越失败: " + err.Error())
	}

	return map[string]interface{}{
		"pet":           pet,
		"stats_before":  statsBefore,
		"stats_after":   pet.Stats,
		"rarity_before": rarityBefore,
		"rarity_after":  newRarity,
		"level":         pet.Level,
		"cost":          cost,
	}, nil
}

