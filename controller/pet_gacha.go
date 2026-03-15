package controller

import (
	"net/http"
	"strconv"

	"github.com/LeoMengTCM/nox-api/common"
	"github.com/LeoMengTCM/nox-api/model"
	"github.com/LeoMengTCM/nox-api/service"
	"github.com/gin-gonic/gin"
)

// ==================== User Gacha ====================

// GetGachaPools 获取活跃卡池列表
func GetGachaPools(c *gin.Context) {
	pools, err := model.GetActiveGachaPools()
	if err != nil {
		common.ApiErrorMsg(c, "获取卡池列表失败")
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    pools,
	})
}

// GachaPull 扭蛋抽取
func GachaPull(c *gin.Context) {
	var req struct {
		PoolId int `json:"pool_id"`
		Count  int `json:"count"`
	}
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}
	if req.Count != 1 && req.Count != 10 {
		common.ApiErrorMsg(c, "抽取次数只能为 1 或 10")
		return
	}

	userId := c.GetInt("id")
	results, err := service.GachaPull(userId, req.PoolId, req.Count)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "抽取成功",
		"data":    results,
	})
}

// GetGachaHistory 获取抽取历史
func GetGachaHistory(c *gin.Context) {
	userId := c.GetInt("id")

	poolId, _ := strconv.Atoi(c.Query("pool_id"))
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	histories, total, err := model.GetGachaHistoryByUser(userId, poolId, page, pageSize)
	if err != nil {
		common.ApiErrorMsg(c, "获取抽取记录失败")
		return
	}

	// Collect unique species IDs and batch fetch species info
	speciesIds := make([]int, 0)
	seen := make(map[int]bool)
	for _, h := range histories {
		if !seen[h.SpeciesId] {
			seen[h.SpeciesId] = true
			speciesIds = append(speciesIds, h.SpeciesId)
		}
	}

	speciesMap := make(map[int]*model.PetSpecies)
	if len(speciesIds) > 0 {
		var speciesList []model.PetSpecies
		model.DB.Where("id IN ?", speciesIds).Find(&speciesList)
		for i := range speciesList {
			speciesMap[speciesList[i].Id] = &speciesList[i]
		}
	}

	// Enrich history entries
	enriched := make([]map[string]interface{}, len(histories))
	for i, h := range histories {
		entry := map[string]interface{}{
			"id":         h.Id,
			"user_id":    h.UserId,
			"pool_id":    h.PoolId,
			"species_id": h.SpeciesId,
			"rarity":     h.Rarity,
			"is_pity":    h.IsPity,
			"created_at": h.CreatedAt,
		}
		if sp, ok := speciesMap[h.SpeciesId]; ok {
			entry["visual_key"] = sp.VisualKey
			entry["species_name"] = sp.Name
		}
		enriched[i] = entry
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"list":  enriched,
			"total": total,
		},
	})
}

// GetPityInfo 获取保底信息
func GetPityInfo(c *gin.Context) {
	userId := c.GetInt("id")
	poolId, err := strconv.Atoi(c.Query("pool_id"))
	if err != nil || poolId <= 0 {
		common.ApiErrorMsg(c, "无效的卡池 ID")
		return
	}

	counter, err := model.GetUserPityCounter(userId, poolId)
	if err != nil {
		common.ApiErrorMsg(c, "获取保底信息失败")
		return
	}

	if counter == nil {
		counter = &model.UserPityCounter{
			UserId:     userId,
			PoolId:     poolId,
			SrCounter:  0,
			SsrCounter: 0,
		}
	}

	// Also get pool's pity config for context
	pool, _ := model.GetGachaPoolById(poolId)
	var pityConfig map[string]int
	if pool != nil && pool.PityConfig != "" {
		_ = common.Unmarshal([]byte(pool.PityConfig), &pityConfig)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"sr_counter":  counter.SrCounter,
			"ssr_counter": counter.SsrCounter,
			"pity_config": pityConfig,
		},
	})
}

// ==================== User Fusion ====================

// FusePet 宠物融合升星
func FusePet(c *gin.Context) {
	var req struct {
		PetId         int `json:"pet_id"`
		MaterialPetId int `json:"material_pet_id"`
	}
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}
	if req.PetId <= 0 || req.MaterialPetId <= 0 {
		common.ApiErrorMsg(c, "无效的宠物 ID")
		return
	}

	userId := c.GetInt("id")
	result, err := service.FusePet(userId, req.PetId, req.MaterialPetId)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "融合成功",
		"data":    result,
	})
}

// TranscendPet 评级超越：两只满星同种同稀有度宠物 → 提升稀有度
func TranscendPet(c *gin.Context) {
	var req struct {
		PetId         int `json:"pet_id"`
		MaterialPetId int `json:"material_pet_id"`
	}
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}
	if req.PetId <= 0 || req.MaterialPetId <= 0 {
		common.ApiErrorMsg(c, "无效的宠物 ID")
		return
	}

	userId := c.GetInt("id")
	result, err := service.TranscendPet(userId, req.PetId, req.MaterialPetId)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "评级超越成功",
		"data":    result,
	})
}

// ==================== Admin Gacha Pools ====================

// AdminGetGachaPools 管理员获取所有卡池
func AdminGetGachaPools(c *gin.Context) {
	pools, err := model.GetAllGachaPools(false)
	if err != nil {
		common.ApiErrorMsg(c, "获取卡池列表失败")
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    pools,
	})
}

// AdminCreateGachaPool 管理员创建卡池
func AdminCreateGachaPool(c *gin.Context) {
	var pool model.GachaPool
	if err := common.DecodeJson(c.Request.Body, &pool); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}
	if pool.Name == "" {
		common.ApiErrorMsg(c, "卡池名称不能为空")
		return
	}

	if err := model.CreateGachaPool(&pool); err != nil {
		common.ApiErrorMsg(c, "创建卡池失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    pool,
	})
}

// AdminUpdateGachaPool 管理员更新卡池
func AdminUpdateGachaPool(c *gin.Context) {
	var pool model.GachaPool
	if err := common.DecodeJson(c.Request.Body, &pool); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}
	if pool.Id == 0 {
		common.ApiErrorMsg(c, "卡池 ID 不能为空")
		return
	}

	if err := model.UpdateGachaPool(&pool); err != nil {
		common.ApiErrorMsg(c, "更新卡池失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// AdminDeleteGachaPool 管理员删除卡池
func AdminDeleteGachaPool(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的卡池 ID")
		return
	}

	if err := model.DeleteGachaPool(id); err != nil {
		common.ApiErrorMsg(c, "删除卡池失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}
