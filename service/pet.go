package service

import (
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/LeoMengTCM/nox-api/common"
	"github.com/LeoMengTCM/nox-api/model"
	"github.com/LeoMengTCM/nox-api/setting/operation_setting"
	"gorm.io/gorm"
)

// defaultPetStatus returns the initial status JSON for a new pet
func defaultPetStatus() string {
	data, _ := common.Marshal(map[string]int{
		"hunger":      100,
		"mood":        100,
		"cleanliness": 100,
	})
	return string(data)
}

// stageMultiplier returns the stat multiplier for a given evolution stage
func stageMultiplier(stage int) float64 {
	switch stage {
	case 1:
		return 1.5
	case 2:
		return 2.5
	default:
		return 1.0
	}
}

// clamp restricts v to [lo, hi]
func clamp(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

// ComputeCurrentStatus calculates real-time pet status with lazy decay.
// It reads the stored status and applies time-based decay:
//   - hunger: -4 per hour since last_fed_at
//   - mood: -3 per hour since last_played_at
//   - cleanliness: -2 per hour since updated_at
//
// If any stat hits 0 and pet is "normal", state becomes "weak" (saved to DB).
// If all stats > 0 and pet is "weak", state becomes "normal" (saved to DB).
func ComputeCurrentStatus(pet *model.UserPet) map[string]int {
	var statusMap map[string]int
	if pet.Status != "" {
		_ = common.Unmarshal([]byte(pet.Status), &statusMap)
	}
	if statusMap == nil {
		statusMap = map[string]int{"hunger": 100, "mood": 100, "cleanliness": 100}
	}

	now := time.Now()

	// Hunger decay based on last_fed_at
	if pet.LastFedAt != nil {
		hours := now.Sub(*pet.LastFedAt).Hours()
		decay := int(math.Floor(hours)) * operation_setting.GetHungerDecayPerHour()
		statusMap["hunger"] = clamp(statusMap["hunger"]-decay, 0, 100)
	}

	// Mood decay based on last_played_at
	if pet.LastPlayedAt != nil {
		hours := now.Sub(*pet.LastPlayedAt).Hours()
		decay := int(math.Floor(hours)) * operation_setting.GetMoodDecayPerHour()
		statusMap["mood"] = clamp(statusMap["mood"]-decay, 0, 100)
	}

	// Cleanliness decay based on updated_at (unix timestamp)
	if pet.UpdatedAt > 0 {
		updatedTime := time.Unix(pet.UpdatedAt, 0)
		hours := now.Sub(updatedTime).Hours()
		decay := int(math.Floor(hours)) * operation_setting.GetCleanlinessDecayPerHour()
		statusMap["cleanliness"] = clamp(statusMap["cleanliness"]-decay, 0, 100)
	} else if pet.CreatedAt > 0 {
		createdTime := time.Unix(pet.CreatedAt, 0)
		hours := now.Sub(createdTime).Hours()
		decay := int(math.Floor(hours)) * operation_setting.GetCleanlinessDecayPerHour()
		statusMap["cleanliness"] = clamp(statusMap["cleanliness"]-decay, 0, 100)
	}

	// Check state transitions
	anyZero := statusMap["hunger"] == 0 || statusMap["mood"] == 0 || statusMap["cleanliness"] == 0
	allPositive := statusMap["hunger"] > 0 && statusMap["mood"] > 0 && statusMap["cleanliness"] > 0

	needsSave := false
	if anyZero && pet.State == "normal" {
		pet.State = "weak"
		needsSave = true
	} else if allPositive && pet.State == "weak" {
		pet.State = "normal"
		needsSave = true
	}

	if needsSave {
		_ = model.UpdateUserPet(pet)
	}

	return statusMap
}

// recomputeStats recalculates pet stats based on species base_stats, level, stage, and star.
// Formula: stat = base * (1 + 0.05*(level-1)) * stageMultiplier * (1 + 0.1*star)
func recomputeStats(pet *model.UserPet, species *model.PetSpecies) {
	var baseStats map[string]float64
	if species.BaseStats != "" {
		_ = common.Unmarshal([]byte(species.BaseStats), &baseStats)
	}
	if baseStats == nil {
		return
	}

	mult := (1.0 + 0.05*float64(pet.Level-1)) * stageMultiplier(pet.Stage) * (1.0 + 0.1*float64(pet.Star))

	computed := make(map[string]int, len(baseStats))
	for k, v := range baseStats {
		computed[k] = int(math.Round(v * mult))
	}

	data, _ := common.Marshal(computed)
	pet.Stats = string(data)
}

// expToNextLevel returns the EXP required to go from level to level+1.
// Formula: level * 100
func expToNextLevel(level int) int {
	return level * operation_setting.GetLevelExpMultiplier()
}

// AddExp grants experience points to a pet, handling level-ups and auto-evolution.
// Returns whether a level-up occurred, whether an evolution occurred, and any error.
func AddExp(pet *model.UserPet, amount int) (leveledUp bool, evolved bool, err error) {
	pet.Exp += amount

	// Check for level-ups (may level up multiple times)
	maxLevel := operation_setting.GetMaxLevel()
	for {
		needed := expToNextLevel(pet.Level)
		if pet.Exp < needed || pet.Level >= maxLevel {
			break
		}
		pet.Exp -= needed
		pet.Level++
		leveledUp = true

		// Auto-evolution checks
		if pet.Level >= operation_setting.GetEvolutionStage1Level() && pet.Stage == 0 {
			pet.Stage = 1
			if pet.HatchedAt == nil {
				now := time.Now()
				pet.HatchedAt = &now
			}
			evolved = true
		} else if pet.Level >= operation_setting.GetEvolutionStage2Level() && pet.Stage == 1 {
			pet.Stage = 2
			evolved = true
		}
	}

	// Recompute stats if leveled up
	if leveledUp {
		species, specErr := model.GetSpeciesById(pet.SpeciesId)
		if specErr == nil && species != nil {
			recomputeStats(pet, species)
		}
	}

	err = model.UpdateUserPet(pet)
	return
}

// AdoptStarter lets a user adopt one of the starter species
func AdoptStarter(userId int, speciesId int) (*model.UserPet, error) {
	if !operation_setting.IsPetEnabled() {
		return nil, errors.New("宠物系统未启用")
	}

	// Check if user already adopted a starter
	adopted, err := model.HasAdoptedStarter(userId)
	if err != nil {
		return nil, err
	}
	if adopted {
		return nil, errors.New("你已经领养过初始宠物了")
	}

	// Validate the species is indeed a starter
	species, err := model.GetSpeciesById(speciesId)
	if err != nil {
		return nil, errors.New("宠物物种不存在")
	}
	if !species.IsStarter || !species.Enabled {
		return nil, errors.New("该物种不可作为初始宠物")
	}

	pet := &model.UserPet{
		UserId:    userId,
		SpeciesId: speciesId,
		Nickname:  species.Name,
		Level:     1,
		Exp:       0,
		Stage:     0,
		Star:      0,
		Stats:     species.BaseStats,
		Status:    defaultPetStatus(),
		IsPrimary: true,
		State:     "normal",
	}

	hatchAt := time.Now().Add(time.Duration(operation_setting.GetHatchDurationMinutes()) * time.Minute)
	pet.HatchedAt = &hatchAt

	if err := model.CreateUserPet(pet); err != nil {
		return nil, errors.New("领养失败")
	}
	return pet, nil
}

// FeedPet feeds a pet using an item from the user's inventory.
// Returns a result map with exp/level change info, or an error.
func FeedPet(userId int, petId int, itemId int) (map[string]interface{}, error) {
	if !operation_setting.IsPetEnabled() {
		return nil, errors.New("宠物系统未启用")
	}

	pet, err := model.GetUserPetById(userId, petId)
	if err != nil {
		return nil, errors.New("宠物不存在")
	}
	if pet.State != "normal" && pet.State != "weak" {
		return nil, errors.New("宠物当前状态无法喂食")
	}

	// Check item exists and is food type
	item, err := model.GetItemById(itemId)
	if err != nil {
		return nil, errors.New("物品不存在")
	}
	if item.Type != "food" {
		return nil, errors.New("该物品不是食物")
	}

	// Check user has the item
	userItem, err := model.GetUserItem(userId, itemId)
	if err != nil {
		return nil, errors.New("获取背包信息失败")
	}
	if userItem == nil || userItem.Quantity <= 0 {
		return nil, errors.New("物品数量不足")
	}

	// Compute real-time status first, then apply effect
	statusMap := ComputeCurrentStatus(pet)

	// Apply effect
	var effectMap map[string]int
	if item.Effect != "" {
		_ = common.Unmarshal([]byte(item.Effect), &effectMap)
	}
	for k, v := range effectMap {
		statusMap[k] += v
		if statusMap[k] > 100 {
			statusMap[k] = 100
		}
	}

	statusBytes, _ := common.Marshal(statusMap)
	pet.Status = string(statusBytes)
	now := time.Now()
	pet.LastFedAt = &now
	pet.UpdatedAt = now.Unix()

	// Consume item + update pet in a single transaction
	err = model.DB.Transaction(func(tx *gorm.DB) error {
		// Remove item from inventory
		if userItem.Quantity == 1 {
			if err := tx.Delete(userItem).Error; err != nil {
				return fmt.Errorf("消耗物品失败: %w", err)
			}
		} else {
			if err := tx.Model(userItem).Updates(map[string]interface{}{
				"quantity":   gorm.Expr("quantity - ?", 1),
				"updated_at": now.Unix(),
			}).Error; err != nil {
				return fmt.Errorf("消耗物品失败: %w", err)
			}
		}

		// Update pet status
		if err := tx.Save(pet).Error; err != nil {
			return fmt.Errorf("更新宠物状态失败: %w", err)
		}

		return nil
	})
	if err != nil {
		return nil, errors.New("喂食失败")
	}

	// Grant EXP
	oldLevel := pet.Level
	leveledUp, evolved, expErr := AddExp(pet, operation_setting.GetFeedExp())
	if expErr != nil {
		common.SysError("FeedPet AddExp failed: " + expErr.Error())
	}

	result := map[string]interface{}{
		"pet":       pet,
		"exp_gained":  operation_setting.GetFeedExp(),
		"leveled_up": leveledUp,
		"evolved":   evolved,
	}
	if leveledUp {
		result["old_level"] = oldLevel
		result["new_level"] = pet.Level
	}

	return result, nil
}

// PlayWithPet interacts with a pet to increase mood.
// Returns a result map with exp/level change info, or an error.
func PlayWithPet(userId int, petId int) (map[string]interface{}, error) {
	if !operation_setting.IsPetEnabled() {
		return nil, errors.New("宠物系统未启用")
	}

	pet, err := model.GetUserPetById(userId, petId)
	if err != nil {
		return nil, errors.New("宠物不存在")
	}
	if pet.State != "normal" && pet.State != "weak" {
		return nil, errors.New("宠物当前状态无法互动")
	}

	// Rate limit: at most once per 5 minutes
	if pet.LastPlayedAt != nil && time.Since(*pet.LastPlayedAt) < time.Duration(operation_setting.GetPlayCooldownMinutes())*time.Minute {
		return nil, errors.New("互动太频繁，请稍后再试")
	}

	// Compute real-time status first (applies time-based decay), then apply effect
	statusMap := ComputeCurrentStatus(pet)

	statusMap["mood"] = clamp(statusMap["mood"]+operation_setting.GetPlayMoodBoost(), 0, 100)

	statusBytes, _ := common.Marshal(statusMap)
	pet.Status = string(statusBytes)
	now := time.Now()
	pet.LastPlayedAt = &now

	if err := model.UpdateUserPet(pet); err != nil {
		return nil, errors.New("更新宠物状态失败")
	}

	// Grant EXP
	oldLevel := pet.Level
	leveledUp, evolved, expErr := AddExp(pet, operation_setting.GetPlayExp())
	if expErr != nil {
		common.SysError("PlayWithPet AddExp failed: " + expErr.Error())
	}

	result := map[string]interface{}{
		"pet":       pet,
		"exp_gained":  operation_setting.GetPlayExp(),
		"leveled_up": leveledUp,
		"evolved":   evolved,
	}
	if leveledUp {
		result["old_level"] = oldLevel
		result["new_level"] = pet.Level
	}

	return result, nil
}

// CleanPet performs a basic clean on a pet (no item consumed).
// Limited to 3 times per day. Restores +20 cleanliness and grants +5 EXP.
func CleanPet(userId int, petId int) (map[string]interface{}, error) {
	if !operation_setting.IsPetEnabled() {
		return nil, errors.New("宠物系统未启用")
	}

	pet, err := model.GetUserPetById(userId, petId)
	if err != nil {
		return nil, errors.New("宠物不存在")
	}
	if pet.State != "normal" && pet.State != "weak" {
		return nil, errors.New("宠物当前状态无法清洁")
	}

	// Compute real-time status first (applies time-based decay)
	statusMap := ComputeCurrentStatus(pet)

	// Check daily clean limit using status fields: clean_count and clean_date
	now := time.Now().UTC()
	today := now.Format("2006-01-02")
	cleanDate := ""
	cleanCount := 0

	// We store clean_date as a special int-encoded date (YYYYMMDD) for JSON compat
	if d, ok := statusMap["clean_date"]; ok {
		y := d / 10000
		m := (d % 10000) / 100
		day := d % 100
		cleanDate = time.Date(y, time.Month(m), day, 0, 0, 0, 0, time.UTC).Format("2006-01-02")
	}
	if cleanDate == today {
		cleanCount = statusMap["clean_count"]
	}
	// else: different day, reset count

	if cleanCount >= operation_setting.GetCleanDailyLimit() {
		return nil, errors.New("今日清洁次数已达上限")
	}

	// Apply cleanliness boost
	statusMap["cleanliness"] = clamp(statusMap["cleanliness"]+operation_setting.GetCleanBoost(), 0, 100)

	// Update clean tracking
	statusMap["clean_date"] = now.Year()*10000 + int(now.Month())*100 + now.Day()
	statusMap["clean_count"] = cleanCount + 1

	statusBytes, _ := common.Marshal(statusMap)
	pet.Status = string(statusBytes)

	if err := model.UpdateUserPet(pet); err != nil {
		return nil, errors.New("更新宠物状态失败")
	}

	// Grant EXP
	oldLevel := pet.Level
	leveledUp, evolved, expErr := AddExp(pet, operation_setting.GetCleanExp())
	if expErr != nil {
		common.SysError("CleanPet AddExp failed: " + expErr.Error())
	}

	result := map[string]interface{}{
		"pet":             pet,
		"exp_gained":        operation_setting.GetCleanExp(),
		"leveled_up":       leveledUp,
		"evolved":         evolved,
		"clean_remaining": operation_setting.GetCleanDailyLimit() - (cleanCount + 1),
	}
	if leveledUp {
		result["old_level"] = oldLevel
		result["new_level"] = pet.Level
	}

	return result, nil
}

// HatchPet evolves a pet from egg (stage 0) to baby (stage 1)
func HatchPet(userId int, petId int) error {
	if !operation_setting.IsPetEnabled() {
		return errors.New("宠物系统未启用")
	}

	pet, err := model.GetUserPetById(userId, petId)
	if err != nil {
		return errors.New("宠物不存在")
	}
	if pet.Stage != 0 {
		return errors.New("宠物不在蛋阶段")
	}

	if pet.HatchedAt != nil && time.Now().Before(*pet.HatchedAt) {
		return errors.New("孵化时间未到")
	}

	pet.Stage = 1
	now := time.Now()
	pet.HatchedAt = &now

	// Recompute stats after stage change (includes star bonus)
	species, specErr := model.GetSpeciesById(pet.SpeciesId)
	if specErr == nil && species != nil {
		recomputeStats(pet, species)
	}

	return model.UpdateUserPet(pet)
}

// EvolvePet evolves a pet to the next stage if conditions are met
func EvolvePet(userId int, petId int) error {
	if !operation_setting.IsPetEnabled() {
		return errors.New("宠物系统未启用")
	}

	pet, err := model.GetUserPetById(userId, petId)
	if err != nil {
		return errors.New("宠物不存在")
	}
	if pet.Stage >= 2 {
		return errors.New("宠物已达到最高阶段")
	}
	if pet.Stage == 0 {
		return errors.New("请先孵化宠物")
	}

	// Level check: stage 1->2 requires configured level
	if pet.Stage == 1 && pet.Level < operation_setting.GetEvolutionStage2Level() {
		return fmt.Errorf("等级不足，进化到最终阶段需要%d级", operation_setting.GetEvolutionStage2Level())
	}

	pet.Stage++

	// Recompute stats after stage change (includes star bonus)
	species, specErr := model.GetSpeciesById(pet.SpeciesId)
	if specErr == nil && species != nil {
		recomputeStats(pet, species)
	}

	return model.UpdateUserPet(pet)
}

// BuyItem purchases an item from the shop using user quota
func BuyItem(userId int, itemId int, quantity int) error {
	if !operation_setting.IsPetEnabled() {
		return errors.New("宠物系统未启用")
	}
	if quantity <= 0 {
		return errors.New("购买数量必须大于0")
	}

	item, err := model.GetItemById(itemId)
	if err != nil {
		return errors.New("物品不存在")
	}
	if !item.Enabled {
		return errors.New("物品已下架")
	}

	totalCost := int(item.Price * float64(quantity))
	if totalCost <= 0 {
		return errors.New("物品价格异常")
	}

	// Check user quota
	quota, err := model.GetUserQuota(userId, true)
	if err != nil {
		return errors.New("获取用户额度失败")
	}
	if quota < totalCost {
		return errors.New("额度不足")
	}

	err = model.DB.Transaction(func(tx *gorm.DB) error {
		// Deduct user quota
		if err := tx.Model(&model.User{}).Where("id = ?", userId).
			Update("quota", gorm.Expr("quota - ?", totalCost)).Error; err != nil {
			return fmt.Errorf("扣除额度失败: %w", err)
		}

		// Add item to inventory
		var existing model.UserPetItem
		result := tx.Where("user_id = ? AND item_id = ?", userId, itemId).First(&existing)
		if result.Error != nil && !errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return fmt.Errorf("查询背包失败: %w", result.Error)
		}
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			now := time.Now().Unix()
			newItem := model.UserPetItem{
				UserId:    userId,
				ItemId:    itemId,
				Quantity:  quantity,
				CreatedAt: now,
				UpdatedAt: now,
			}
			if err := tx.Create(&newItem).Error; err != nil {
				return fmt.Errorf("添加物品失败: %w", err)
			}
		} else {
			if err := tx.Model(&existing).Updates(map[string]interface{}{
				"quantity":   gorm.Expr("quantity + ?", quantity),
				"updated_at": time.Now().Unix(),
			}).Error; err != nil {
				return fmt.Errorf("添加物品失败: %w", err)
			}
		}

		return nil
	})
	if err != nil {
		return errors.New("购买失败")
	}

	return nil
}

// GetPetDetail returns a pet with its species info, computed status, and exp progress
func GetPetDetail(userId int, petId int) (map[string]interface{}, error) {
	pet, err := model.GetUserPetById(userId, petId)
	if err != nil {
		return nil, errors.New("宠物不存在")
	}

	species, err := model.GetSpeciesById(pet.SpeciesId)
	if err != nil {
		return nil, errors.New("物种信息不存在")
	}

	computedStatus := ComputeCurrentStatus(pet)

	nextLevelExp := expToNextLevel(pet.Level)
	var expProgress float64
	if nextLevelExp > 0 {
		expProgress = float64(pet.Exp) / float64(nextLevelExp)
	}

	// Extract clean_count_today from status
	cleanCountToday := 0
	today := time.Now().UTC().Format("2006-01-02")
	if d, ok := computedStatus["clean_date"]; ok {
		y := d / 10000
		m := (d % 10000) / 100
		day := d % 100
		cleanDate := time.Date(y, time.Month(m), day, 0, 0, 0, 0, time.UTC).Format("2006-01-02")
		if cleanDate == today {
			cleanCountToday = computedStatus["clean_count"]
		}
	}

	result := map[string]interface{}{
		"pet":               pet,
		"species":           species,
		"computed_status":   computedStatus,
		"next_level_exp":    nextLevelExp,
		"exp_progress":      math.Round(expProgress*100) / 100,
		"clean_count_today": cleanCountToday,
		"rarity":            species.Rarity,
	}
	if pet.Stage == 0 && pet.HatchedAt != nil {
		result["hatch_ready_at"] = pet.HatchedAt
		remaining := time.Until(*pet.HatchedAt).Seconds()
		if remaining < 0 {
			remaining = 0
		}
		result["hatch_countdown"] = int(remaining)
	}
	return result, nil
}

// ComputePetSummary returns a lightweight summary of a pet with computed status.
// An optional species parameter can be passed to avoid an extra DB query.
func ComputePetSummary(pet *model.UserPet, speciesOpt ...*model.PetSpecies) map[string]interface{} {
	computedStatus := ComputeCurrentStatus(pet)
	nextLevelExp := expToNextLevel(pet.Level)
	var expProgress float64
	if nextLevelExp > 0 {
		expProgress = float64(pet.Exp) / float64(nextLevelExp)
	}

	// Include species-level fields for frontend convenience
	var species *model.PetSpecies
	if len(speciesOpt) > 0 && speciesOpt[0] != nil {
		species = speciesOpt[0]
	} else {
		sp, err := model.GetSpeciesById(pet.SpeciesId)
		if err == nil {
			species = sp
		}
	}

	speciesName := ""
	visualKey := ""
	rarity := "N"
	element := ""
	if species != nil {
		speciesName = species.Name
		visualKey = species.VisualKey
		rarity = species.Rarity
		element = species.Element
	}

	result := map[string]interface{}{
		// Flat pet fields for direct access
		"id":           pet.Id,
		"user_id":      pet.UserId,
		"species_id":   pet.SpeciesId,
		"nickname":     pet.Nickname,
		"level":        pet.Level,
		"exp":          pet.Exp,
		"stage":        pet.Stage,
		"star":         pet.Star,
		"stats":        pet.Stats,
		"status":       pet.Status,
		"is_primary":   pet.IsPrimary,
		"state":        pet.State,
		"last_fed_at":  pet.LastFedAt,
		"last_played_at": pet.LastPlayedAt,
		"hatched_at":   pet.HatchedAt,
		"created_at":   pet.CreatedAt,
		"updated_at":   pet.UpdatedAt,
		// Species-level fields
		"species_name": speciesName,
		"visual_key":   visualKey,
		"rarity":       rarity,
		"element":      element,
		// Computed fields
		"computed_status": computedStatus,
		"next_level_exp":  nextLevelExp,
		"exp_progress":    math.Round(expProgress*100) / 100,
	}
	if pet.Stage == 0 && pet.HatchedAt != nil {
		result["hatch_ready_at"] = pet.HatchedAt
		remaining := time.Until(*pet.HatchedAt).Seconds()
		if remaining < 0 {
			remaining = 0
		}
		result["hatch_countdown"] = int(remaining)
	}
	return result
}

// ReleasePet permanently releases a pet (deletes it)
func ReleasePet(userId int, petId int) error {
	if !operation_setting.IsPetEnabled() {
		return errors.New("宠物系统未启用")
	}

	pet, err := model.GetUserPetById(userId, petId)
	if err != nil {
		return errors.New("宠物不存在")
	}
	if pet.IsPrimary {
		return errors.New("主宠不能放养")
	}
	if pet.State == "dispatched" {
		return errors.New("派遣中的宠物不能放养")
	}
	if pet.State == "listed" {
		return errors.New("上架中的宠物不能放养")
	}

	return model.DeleteUserPet(userId, petId)
}

// UseItem applies a potion item on a pet
func UseItem(userId int, petId int, itemId int) error {
	if !operation_setting.IsPetEnabled() {
		return errors.New("宠物系统未启用")
	}

	pet, err := model.GetUserPetById(userId, petId)
	if err != nil {
		return errors.New("宠物不存在")
	}

	item, err := model.GetItemById(itemId)
	if err != nil {
		return errors.New("物品不存在")
	}
	if item.Type != "potion" {
		return errors.New("该物品不是药水")
	}

	userItem, err := model.GetUserItem(userId, itemId)
	if err != nil {
		return errors.New("获取背包信息失败")
	}
	if userItem == nil || userItem.Quantity <= 0 {
		return errors.New("物品数量不足")
	}

	// Apply effect
	var statusMap map[string]int
	if pet.Status != "" {
		_ = common.Unmarshal([]byte(pet.Status), &statusMap)
	}
	if statusMap == nil {
		statusMap = map[string]int{"hunger": 100, "mood": 100, "cleanliness": 100}
	}

	var effectMap map[string]int
	if item.Effect != "" {
		_ = common.Unmarshal([]byte(item.Effect), &effectMap)
	}
	for k, v := range effectMap {
		statusMap[k] += v
		if statusMap[k] > 100 {
			statusMap[k] = 100
		}
	}

	statusBytes, _ := common.Marshal(statusMap)
	pet.Status = string(statusBytes)

	// Consume item + update pet in a single transaction
	now := time.Now()
	return model.DB.Transaction(func(tx *gorm.DB) error {
		// Remove item from inventory
		if userItem.Quantity == 1 {
			if err := tx.Delete(userItem).Error; err != nil {
				return fmt.Errorf("消耗物品失败: %w", err)
			}
		} else {
			if err := tx.Model(userItem).Updates(map[string]interface{}{
				"quantity":   gorm.Expr("quantity - ?", 1),
				"updated_at": now.Unix(),
			}).Error; err != nil {
				return fmt.Errorf("消耗物品失败: %w", err)
			}
		}

		// Update pet status
		if err := tx.Save(pet).Error; err != nil {
			return fmt.Errorf("更新宠物状态失败: %w", err)
		}

		return nil
	})
}
