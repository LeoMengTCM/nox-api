package controller

import (
	"net/http"
	"strconv"

	"github.com/LeoMengTCM/nox-api/common"
	"github.com/LeoMengTCM/nox-api/model"
	"github.com/LeoMengTCM/nox-api/service"
	"github.com/LeoMengTCM/nox-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
)

// GetPetStatus 获取宠物系统状态和初始宠物列表
func GetPetStatus(c *gin.Context) {
	setting := operation_setting.GetPetSetting()
	if !setting.Enabled {
		common.ApiErrorMsg(c, "宠物系统未启用")
		return
	}

	userId := c.GetInt("id")
	adopted, _ := model.HasAdoptedStarter(userId)
	starters, _ := model.GetStarterSpecies()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"enabled":          setting.Enabled,
			"max_pets_per_user": setting.MaxPetsPerUser,
			"has_starter":      adopted,
			"starters":         starters,
		},
	})
}

// GetSpeciesList 获取所有宠物物种
func GetSpeciesList(c *gin.Context) {
	species, err := model.GetAllSpecies(true)
	if err != nil {
		common.ApiErrorMsg(c, "获取物种列表失败")
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    species,
	})
}

// AdoptStarter 领养初始宠物
func AdoptStarter(c *gin.Context) {
	var req struct {
		SpeciesId int `json:"species_id"`
	}
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}

	userId := c.GetInt("id")
	pet, err := service.AdoptStarter(userId, req.SpeciesId)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "领养成功",
		"data":    pet,
	})
}

// GetMyPets 获取我的宠物列表（含实时状态）
func GetMyPets(c *gin.Context) {
	userId := c.GetInt("id")
	pets, err := model.GetUserPets(userId)
	if err != nil {
		common.ApiErrorMsg(c, "获取宠物列表失败")
		return
	}

	// Batch-fetch all species to avoid N+1 queries
	allSpecies, _ := model.GetAllSpecies(false)
	speciesMap := make(map[int]*model.PetSpecies, len(allSpecies))
	for i := range allSpecies {
		speciesMap[allSpecies[i].Id] = &allSpecies[i]
	}

	summaries := make([]map[string]interface{}, len(pets))
	for i := range pets {
		summaries[i] = service.ComputePetSummary(&pets[i], speciesMap[pets[i].SpeciesId])
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    summaries,
	})
}

// GetMyPetDetail 获取宠物详情
func GetMyPetDetail(c *gin.Context) {
	petId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的宠物 ID")
		return
	}

	userId := c.GetInt("id")
	detail, err := service.GetPetDetail(userId, petId)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    detail,
	})
}

// SetPrimaryPet 设置展示宠物
func SetPrimaryPet(c *gin.Context) {
	petId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的宠物 ID")
		return
	}

	userId := c.GetInt("id")
	if err := model.SetPrimaryPet(userId, petId); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// RenamePet 重命名宠物
func RenamePet(c *gin.Context) {
	petId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的宠物 ID")
		return
	}

	var req struct {
		Nickname string `json:"nickname"`
	}
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}
	if len([]rune(req.Nickname)) > 16 || req.Nickname == "" {
		common.ApiErrorMsg(c, "昵称长度需在1-16个字符之间")
		return
	}

	userId := c.GetInt("id")
	pet, err := model.GetUserPetById(userId, petId)
	if err != nil {
		common.ApiErrorMsg(c, "宠物不存在")
		return
	}

	pet.Nickname = req.Nickname
	if err := model.UpdateUserPet(pet); err != nil {
		common.ApiErrorMsg(c, "重命名失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// FeedPet 喂食宠物
func FeedPet(c *gin.Context) {
	petId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的宠物 ID")
		return
	}

	var req struct {
		ItemId int `json:"item_id"`
	}
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}

	userId := c.GetInt("id")
	result, err := service.FeedPet(userId, petId, req.ItemId)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "喂食成功",
		"data":    result,
	})
}

// FeedAllPet 一键喂食
func FeedAllPet(c *gin.Context) {
	petId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的宠物 ID")
		return
	}

	userId := c.GetInt("id")
	result, err := service.FeedAllPet(userId, petId)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "一键喂食完成",
		"data":    result,
	})
}

// PlayWithPet 与宠物互动
func PlayWithPet(c *gin.Context) {
	petId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的宠物 ID")
		return
	}

	userId := c.GetInt("id")
	result, err := service.PlayWithPet(userId, petId)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "互动成功",
		"data":    result,
	})
}

// CleanPet 清洁宠物
func CleanPet(c *gin.Context) {
	petId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的宠物 ID")
		return
	}

	userId := c.GetInt("id")
	result, err := service.CleanPet(userId, petId)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "清洁成功",
		"data":    result,
	})
}

// HatchPet 孵化宠物
func HatchPet(c *gin.Context) {
	petId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的宠物 ID")
		return
	}

	userId := c.GetInt("id")
	if err := service.HatchPet(userId, petId); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "孵化成功",
	})
}

// EvolvePet 进化宠物
func EvolvePet(c *gin.Context) {
	petId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的宠物 ID")
		return
	}

	userId := c.GetInt("id")
	if err := service.EvolvePet(userId, petId); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "进化成功",
	})
}

// ReleasePet 放养宠物
func ReleasePet(c *gin.Context) {
	petId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的宠物 ID")
		return
	}
	userId := c.GetInt("id")
	if err := service.ReleasePet(userId, petId); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "宠物已放养",
	})
}

// GetShopItems 获取商店物品列表
func GetShopItems(c *gin.Context) {
	items, err := model.GetAllItems(true)
	if err != nil {
		common.ApiErrorMsg(c, "获取商店物品失败")
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    items,
	})
}

// BuyItem 购买物品
func BuyItem(c *gin.Context) {
	var req struct {
		ItemId   int `json:"item_id"`
		Quantity int `json:"quantity"`
	}
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}

	userId := c.GetInt("id")
	if err := service.BuyItem(userId, req.ItemId, req.Quantity); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "购买成功",
	})
}

// GetMyInventory 获取我的背包
func GetMyInventory(c *gin.Context) {
	userId := c.GetInt("id")
	userItems, err := model.GetUserInventory(userId)
	if err != nil {
		common.ApiErrorMsg(c, "获取背包失败")
		return
	}

	// Fetch all items to enrich inventory
	allItems, _ := model.GetAllItems(false)
	itemMap := make(map[int]*model.PetItem, len(allItems))
	for i := range allItems {
		itemMap[allItems[i].Id] = &allItems[i]
	}

	enriched := make([]map[string]interface{}, 0, len(userItems))
	for _, ui := range userItems {
		entry := map[string]interface{}{
			"id":       ui.Id,
			"user_id":  ui.UserId,
			"item_id":  ui.ItemId,
			"quantity": ui.Quantity,
		}
		if item, ok := itemMap[ui.ItemId]; ok {
			entry["name"] = item.Name
			entry["type"] = item.Type
			entry["effect"] = item.Effect
			entry["rarity"] = item.Rarity
			entry["description"] = item.Description
			entry["price"] = item.Price
			entry["visual_key"] = item.VisualKey
		}
		enriched = append(enriched, entry)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    enriched,
	})
}

// UseItem 使用物品
func UseItem(c *gin.Context) {
	petId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的宠物 ID")
		return
	}

	var req struct {
		ItemId int `json:"item_id"`
	}
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}

	userId := c.GetInt("id")
	if err := service.UseItem(userId, petId, req.ItemId); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "使用成功",
	})
}
