package controller

import (
	"fmt"
	"math/rand"
	"net/http"
	"time"

	"github.com/LeoMengTCM/nox-api/common"
	"github.com/LeoMengTCM/nox-api/logger"
	"github.com/LeoMengTCM/nox-api/model"
	"github.com/LeoMengTCM/nox-api/service"
	"github.com/LeoMengTCM/nox-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
)

// GetCheckinStatus 获取用户签到状态和历史记录
func GetCheckinStatus(c *gin.Context) {
	setting := operation_setting.GetCheckinSetting()
	if !setting.Enabled {
		common.ApiErrorMsg(c, "签到功能未启用")
		return
	}
	userId := c.GetInt("id")
	// 获取月份参数，默认为当前月份
	month := c.DefaultQuery("month", time.Now().Format("2006-01"))

	stats, err := model.GetUserCheckinStats(userId, month)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"enabled":   setting.Enabled,
			"min_quota": setting.MinQuota,
			"max_quota": setting.MaxQuota,
			"stats":     stats,
		},
	})
}

// DoCheckin 执行用户签到
func DoCheckin(c *gin.Context) {
	setting := operation_setting.GetCheckinSetting()
	if !setting.Enabled {
		common.ApiErrorMsg(c, "签到功能未启用")
		return
	}

	userId := c.GetInt("id")

	checkin, err := model.UserCheckin(userId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	model.RecordLog(userId, model.LogTypeSystem, fmt.Sprintf("用户签到，获得额度 %s", logger.LogQuota(checkin.QuotaAwarded)))

	// Build response data
	data := gin.H{
		"quota_awarded": checkin.QuotaAwarded,
		"checkin_date":  checkin.CheckinDate,
	}

	// Pet rewards (best-effort, never blocks checkin)
	petRewards := computeCheckinPetRewards(userId)
	if petRewards != nil {
		data["pet_rewards"] = petRewards
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "签到成功",
		"data":    data,
	})
}

// computeCheckinPetRewards calculates and applies pet rewards after a successful checkin.
// Returns nil if pet system is disabled or user has no primary pet.
func computeCheckinPetRewards(userId int) map[string]interface{} {
	if !operation_setting.IsPetEnabled() {
		return nil
	}

	// Get user's primary pet
	pet, err := model.GetUserPrimaryPet(userId)
	if err != nil || pet == nil {
		return nil
	}

	// Get enabled food items to pick a random one
	foodItems, err := model.GetEnabledFoodItems()
	if err != nil || len(foodItems) == 0 {
		return nil
	}

	// Calculate consecutive days (today's checkin is already recorded)
	consecutiveDays := model.GetConsecutiveCheckinDays(userId)

	// Pick a random food item
	foodItem := foodItems[rand.Intn(len(foodItems))]

	// Base rewards
	foodQty := 1 + rand.Intn(2) // 1-2
	baseExp := 20 + rand.Intn(11) // 20-30

	// Streak bonuses
	if consecutiveDays >= 7 {
		foodQty += 2
		baseExp *= 2
	} else if consecutiveDays >= 3 {
		foodQty += 1
	}

	// Apply rewards: add food to inventory
	_ = model.AddUserItem(userId, foodItem.Id, foodQty)

	// Apply rewards: add EXP to primary pet
	oldLevel := pet.Level
	leveledUp, evolved, _ := service.AddExp(pet, baseExp)

	rewards := map[string]interface{}{
		"food_item_id":    foodItem.Id,
		"food_item_name":  foodItem.Name,
		"food_quantity":   foodQty,
		"exp_gained":      baseExp,
		"consecutive_days": consecutiveDays,
		"pet_id":          pet.Id,
		"pet_nickname":    pet.Nickname,
		"leveled_up":      leveledUp,
		"evolved":         evolved,
	}
	if leveledUp {
		rewards["old_level"] = oldLevel
		rewards["new_level"] = pet.Level
	}

	return rewards
}
