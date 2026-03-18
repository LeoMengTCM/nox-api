package service

import (
	"errors"
	"fmt"
	"math"
	"math/rand"
	"time"

	"github.com/LeoMengTCM/nox-api/common"
	"github.com/LeoMengTCM/nox-api/model"
	"github.com/LeoMengTCM/nox-api/setting/operation_setting"
	"gorm.io/gorm"
)

// MissionReward defines a single reward entry in a mission's rewards JSON
type MissionReward struct {
	Type        string  `json:"type"`        // "quota", "item", "exp"
	Amount      int     `json:"amount"`      // amount to grant
	ItemId      int     `json:"id"`          // item id (for type=item)
	Probability float64 `json:"probability"` // 0.0-1.0
}

// DispatchPet sends a pet on a mission
func DispatchPet(userId, petId, missionId int) (map[string]interface{}, error) {
	if !operation_setting.IsPetEnabled() {
		return nil, errors.New("宠物系统未启用")
	}

	// Validate pet belongs to user
	pet, err := model.GetUserPetById(userId, petId)
	if err != nil {
		return nil, errors.New("宠物不存在")
	}
	if pet.State != "normal" {
		return nil, errors.New("宠物当前状态无法派遣")
	}

	// Validate mission
	mission, err := model.GetMissionById(missionId)
	if err != nil {
		return nil, errors.New("任务不存在")
	}
	if !mission.Enabled {
		return nil, errors.New("任务未启用")
	}

	// Check level requirement
	if pet.Level < mission.RequiredLevel {
		return nil, errors.New("宠物等级不足")
	}

	// Check daily count limit
	todayCount, err := model.GetTodayDispatchCount(userId, missionId)
	if err != nil {
		return nil, errors.New("获取派遣次数失败")
	}
	if int(todayCount) >= mission.MaxDaily {
		return nil, errors.New("今日该任务派遣次数已达上限")
	}

	// Set pet state to dispatched + create dispatch record in a transaction
	now := time.Now().Unix()
	dispatch := &model.PetDispatch{
		UserId:    userId,
		PetId:     petId,
		MissionId: missionId,
		StartedAt: now,
		EndsAt:    now + int64(mission.Duration),
		Status:    "in_progress",
	}

	err = model.DB.Transaction(func(tx *gorm.DB) error {
		// Update pet state
		pet.State = "dispatched"
		pet.UpdatedAt = now
		if err := tx.Save(pet).Error; err != nil {
			return fmt.Errorf("更新宠物状态失败: %w", err)
		}

		// Create dispatch record
		dispatch.CreatedAt = now
		if err := tx.Create(dispatch).Error; err != nil {
			return fmt.Errorf("创建派遣记录失败: %w", err)
		}

		return nil
	})
	if err != nil {
		return nil, errors.New("派遣失败")
	}

	return map[string]interface{}{
		"dispatch": dispatch,
		"pet":      pet,
		"mission":  mission,
	}, nil
}

// CheckAndCompleteDispatches performs lazy completion of expired dispatches
func CheckAndCompleteDispatches(userId int) (int, error) {
	now := time.Now().Unix()
	dispatches, err := model.GetInProgressDispatchesEndedBefore(userId, now)
	if err != nil {
		return 0, err
	}

	completed := 0
	for i := range dispatches {
		d := &dispatches[i]

		// Get pet and mission to calculate success
		pet, petErr := model.GetUserPetById(userId, d.PetId)
		mission, missionErr := model.GetMissionById(d.MissionId)

		success := false
		if petErr == nil && missionErr == nil && pet != nil && mission != nil {
			successRate := CalculateSuccessRate(pet, mission)
			rng := rand.New(rand.NewSource(time.Now().UnixNano() + int64(d.Id)))
			success = rng.Float64() < successRate
		}

		d.Status = "completed"
		d.Success = success
		if err := model.UpdateDispatch(d); err != nil {
			continue
		}
		completed++
	}

	return completed, nil
}

// CalculateSuccessRate computes the success probability for a pet on a mission
// Success rate = sum(stat_value * weight) / sum(max_stat * weight), clamped to [0.1, 0.95]
func CalculateSuccessRate(pet *model.UserPet, mission *model.PetMission) float64 {
	var petStats map[string]float64
	if pet.Stats != "" {
		_ = common.Unmarshal([]byte(pet.Stats), &petStats)
	}
	if petStats == nil {
		petStats = make(map[string]float64)
	}

	var statWeights map[string]float64
	if mission.StatWeights != "" {
		_ = common.Unmarshal([]byte(mission.StatWeights), &statWeights)
	}
	if statWeights == nil || len(statWeights) == 0 {
		return 0.5 // default 50% if no weights configured
	}

	// Max stat reference: base ~100 at high level with star bonuses
	const maxStatRef = 200.0

	weightedSum := 0.0
	weightedMax := 0.0
	for stat, weight := range statWeights {
		val := petStats[stat]
		weightedSum += val * weight
		weightedMax += maxStatRef * weight
	}

	if weightedMax <= 0 {
		return 0.5
	}

	rate := weightedSum / weightedMax
	// Clamp to [0.1, 0.95]
	rate = math.Max(0.1, math.Min(0.95, rate))
	return rate
}

// CollectReward collects rewards from a completed dispatch
func CollectReward(userId, dispatchId int) (map[string]interface{}, error) {
	if !operation_setting.IsPetEnabled() {
		return nil, errors.New("宠物系统未启用")
	}

	dispatch, err := model.GetDispatchById(dispatchId)
	if err != nil {
		return nil, errors.New("派遣记录不存在")
	}
	if dispatch.UserId != userId {
		return nil, errors.New("无权操作该派遣记录")
	}
	if dispatch.Status != "completed" {
		return nil, errors.New("派遣尚未完成或已领取")
	}

	mission, err := model.GetMissionById(dispatch.MissionId)
	if err != nil {
		return nil, errors.New("任务不存在")
	}

	pet, err := model.GetUserPetById(userId, dispatch.PetId)
	if err != nil {
		return nil, errors.New("宠物不存在")
	}

	// Parse mission rewards
	var missionRewards []MissionReward
	if mission.Rewards != "" {
		_ = common.Unmarshal([]byte(mission.Rewards), &missionRewards)
	}

	// Calculate actual rewards (random rolls happen outside the transaction)
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	var actualRewards []map[string]interface{}

	if dispatch.Success {
		for _, reward := range missionRewards {
			if rng.Float64() >= reward.Probability {
				continue
			}
			granted := map[string]interface{}{
				"type":   reward.Type,
				"amount": reward.Amount,
			}
			if reward.Type == "item" {
				granted["item_id"] = reward.ItemId
			}
			actualRewards = append(actualRewards, granted)
		}
	}

	// Base EXP for completing dispatch (even on failure)
	baseExp := 30 + mission.Difficulty*15

	// Apply all rewards + status updates in a single transaction
	err = model.DB.Transaction(func(tx *gorm.DB) error {
		now := time.Now().Unix()

		// Grant rewards
		for _, reward := range actualRewards {
			rewardType := reward["type"].(string)
			amount := reward["amount"].(int)

			switch rewardType {
			case "quota":
				if err := tx.Model(&model.User{}).Where("id = ?", userId).
					Update("quota", gorm.Expr("quota + ?", amount)).Error; err != nil {
					return fmt.Errorf("增加额度失败: %w", err)
				}
			case "item":
				itemId := reward["item_id"].(int)
				var existing model.UserPetItem
				result := tx.Where("user_id = ? AND item_id = ?", userId, itemId).First(&existing)
				if result.Error != nil && !errors.Is(result.Error, gorm.ErrRecordNotFound) {
					return fmt.Errorf("查询背包失败: %w", result.Error)
				}
				if errors.Is(result.Error, gorm.ErrRecordNotFound) {
					newItem := model.UserPetItem{
						UserId:    userId,
						ItemId:    itemId,
						Quantity:  amount,
						CreatedAt: now,
						UpdatedAt: now,
					}
					if err := tx.Create(&newItem).Error; err != nil {
						return fmt.Errorf("添加物品失败: %w", err)
					}
				} else {
					if err := tx.Model(&existing).Updates(map[string]interface{}{
						"quantity":   gorm.Expr("quantity + ?", amount),
						"updated_at": now,
					}).Error; err != nil {
						return fmt.Errorf("添加物品失败: %w", err)
					}
				}
			case "exp":
				// Bonus EXP rewards are added to baseExp and applied together below
				baseExp += amount
			}
		}

		// Apply all EXP (base + bonus) to pet
		pet.Exp += baseExp
		for {
			needed := expToNextLevel(pet.Level)
			if pet.Exp < needed {
				break
			}
			pet.Exp -= needed
			pet.Level++

			if pet.Level >= operation_setting.GetEvolutionStage1Level() && pet.Stage == 0 {
				pet.Stage = 1
				if pet.HatchedAt == nil {
					t := time.Now()
					pet.HatchedAt = &t
				}
			} else if pet.Level >= operation_setting.GetEvolutionStage2Level() && pet.Stage == 1 {
				pet.Stage = 2
			}
		}

		// Recompute stats
		species, specErr := model.GetSpeciesById(pet.SpeciesId)
		if specErr == nil && species != nil {
			recomputeStats(pet, species)
		}

		// Restore pet state to normal
		if pet.State == "dispatched" {
			pet.State = "normal"
		}
		pet.UpdatedAt = now
		if err := tx.Save(pet).Error; err != nil {
			return fmt.Errorf("更新宠物失败: %w", err)
		}

		// Update dispatch status
		rewardsJSON, _ := common.Marshal(actualRewards)
		dispatch.Status = "collected"
		dispatch.RewardsData = string(rewardsJSON)
		if err := tx.Save(dispatch).Error; err != nil {
			return fmt.Errorf("更新派遣记录失败: %w", err)
		}

		// Create activity record
		activityData, _ := common.Marshal(map[string]interface{}{
			"mission_name": mission.Name,
			"success":      dispatch.Success,
			"rewards":      actualRewards,
		})
		activity := &model.PetActivity{
			UserId:       userId,
			PetId:        dispatch.PetId,
			ActivityType: "mission_complete",
			Data:         string(activityData),
			CreatedAt:    now,
		}
		if err := tx.Create(activity).Error; err != nil {
			return fmt.Errorf("创建活动记录失败: %w", err)
		}

		return nil
	})
	if err != nil {
		return nil, errors.New("领取奖励失败")
	}

	return map[string]interface{}{
		"dispatch": dispatch,
		"success":  dispatch.Success,
		"rewards":  actualRewards,
		"base_exp": baseExp,
	}, nil
}

// CreatePetActivity creates a pet activity record
func CreatePetActivity(userId, petId int, activityType string, data interface{}) error {
	dataJSON, _ := common.Marshal(data)
	return model.CreateActivity(&model.PetActivity{
		UserId:       userId,
		PetId:        petId,
		ActivityType: activityType,
		Data:         string(dataJSON),
	})
}

// GetPublicPetProfile returns a user's pets and stats for public viewing
func GetPublicPetProfile(userId int) (map[string]interface{}, error) {
	pets, err := model.GetUserPetsByUserId(userId)
	if err != nil {
		return nil, errors.New("获取宠物列表失败")
	}

	summaries := make([]map[string]interface{}, len(pets))
	for i := range pets {
		summaries[i] = ComputePetSummary(&pets[i])
	}

	stats, err := model.GetUserPetStats(userId)
	if err != nil {
		stats = &model.PetStatsResult{}
	}

	return map[string]interface{}{
		"pets":  summaries,
		"stats": stats,
	}, nil
}

// RankingEntry represents a single entry in a ranking list
type RankingEntry struct {
	UserId    int    `json:"user_id"`
	Username  string `json:"username"`
	AvatarUrl string `json:"avatar_url,omitempty"`
	Value     int    `json:"value"`
	PetName   string `json:"pet_name,omitempty"`
}

// GetPetRanking returns top 20 rankings by level, pet count, and star count
func GetPetRanking() (map[string]interface{}, error) {
	// (a) Highest single pet level
	var levelRanking []struct {
		UserId   int    `gorm:"column:user_id"`
		Nickname string `gorm:"column:nickname"`
		Level    int    `gorm:"column:level"`
	}
	model.DB.Model(&model.UserPet{}).
		Select("user_id, nickname, level").
		Order("level desc, id asc").
		Limit(20).
		Find(&levelRanking)

	// (b) Most pets owned
	var countRanking []struct {
		UserId   int   `gorm:"column:user_id"`
		PetCount int64 `gorm:"column:pet_count"`
	}
	model.DB.Model(&model.UserPet{}).
		Select("user_id, COUNT(*) as pet_count").
		Group("user_id").
		Order("pet_count desc").
		Limit(20).
		Find(&countRanking)

	// (c) Highest total star count
	var starRanking []struct {
		UserId     int   `gorm:"column:user_id"`
		TotalStars int64 `gorm:"column:total_stars"`
	}
	model.DB.Model(&model.UserPet{}).
		Select("user_id, COALESCE(SUM(star), 0) as total_stars").
		Group("user_id").
		Order("total_stars desc").
		Limit(20).
		Find(&starRanking)

	// (d) Total power ranking
	var powerRanking []struct {
		UserId     int   `gorm:"column:user_id"`
		TotalPower int64 `gorm:"column:total_power"`
	}
	model.DB.Model(&model.UserPet{}).
		Select("user_id, COALESCE(SUM(power), 0) as total_power").
		Group("user_id").
		Order("total_power desc").
		Limit(20).
		Find(&powerRanking)

	// (e) SSR collection ranking
	var ssrRanking []struct {
		UserId   int   `gorm:"column:user_id"`
		SsrCount int64 `gorm:"column:ssr_count"`
	}
	model.DB.Model(&model.UserPet{}).
		Where("rarity = ?", "SSR").
		Select("user_id, COUNT(*) as ssr_count").
		Group("user_id").
		Order("ssr_count desc").
		Limit(20).
		Find(&ssrRanking)

	// Collect all unique user IDs from all rankings
	userIdSet := make(map[int]struct{})
	for _, r := range levelRanking {
		userIdSet[r.UserId] = struct{}{}
	}
	for _, r := range countRanking {
		userIdSet[r.UserId] = struct{}{}
	}
	for _, r := range starRanking {
		userIdSet[r.UserId] = struct{}{}
	}
	for _, r := range powerRanking {
		userIdSet[r.UserId] = struct{}{}
	}
	for _, r := range ssrRanking {
		userIdSet[r.UserId] = struct{}{}
	}

	userIds := make([]int, 0, len(userIdSet))
	for id := range userIdSet {
		userIds = append(userIds, id)
	}

	// Batch-fetch all usernames in one query
	usernameMap := make(map[int]string)
	avatarMap := make(map[int]string)
	if len(userIds) > 0 {
		var users []struct {
			Id        int    `gorm:"column:id"`
			Username  string `gorm:"column:username"`
			AvatarUrl string `gorm:"column:avatar_url"`
		}
		model.DB.Table("users").Select("id, username, avatar_url").Where("id IN ?", userIds).Find(&users)
		for _, u := range users {
			usernameMap[u.Id] = u.Username
			avatarMap[u.Id] = u.AvatarUrl
		}
	}

	// Build ranking entries using the pre-fetched username map
	levelEntries := make([]RankingEntry, 0, len(levelRanking))
	for _, r := range levelRanking {
		levelEntries = append(levelEntries, RankingEntry{
			UserId:    r.UserId,
			Username:  usernameMap[r.UserId],
			AvatarUrl: avatarMap[r.UserId],
			Value:     r.Level,
			PetName:   r.Nickname,
		})
	}

	countEntries := make([]RankingEntry, 0, len(countRanking))
	for _, r := range countRanking {
		countEntries = append(countEntries, RankingEntry{
			UserId:    r.UserId,
			Username:  usernameMap[r.UserId],
			AvatarUrl: avatarMap[r.UserId],
			Value:     int(r.PetCount),
		})
	}

	starEntries := make([]RankingEntry, 0, len(starRanking))
	for _, r := range starRanking {
		starEntries = append(starEntries, RankingEntry{
			UserId:    r.UserId,
			Username:  usernameMap[r.UserId],
			AvatarUrl: avatarMap[r.UserId],
			Value:     int(r.TotalStars),
		})
	}

	powerEntries := make([]RankingEntry, 0, len(powerRanking))
	for _, r := range powerRanking {
		powerEntries = append(powerEntries, RankingEntry{
			UserId:    r.UserId,
			Username:  usernameMap[r.UserId],
			AvatarUrl: avatarMap[r.UserId],
			Value:     int(r.TotalPower),
		})
	}

	ssrEntries := make([]RankingEntry, 0, len(ssrRanking))
	for _, r := range ssrRanking {
		ssrEntries = append(ssrEntries, RankingEntry{
			UserId:    r.UserId,
			Username:  usernameMap[r.UserId],
			AvatarUrl: avatarMap[r.UserId],
			Value:     int(r.SsrCount),
		})
	}

	return map[string]interface{}{
		"level_ranking": levelEntries,
		"count_ranking": countEntries,
		"star_ranking":  starEntries,
		"power_ranking": powerEntries,
		"ssr_ranking":   ssrEntries,
	}, nil
}
