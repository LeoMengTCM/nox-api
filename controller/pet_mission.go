package controller

import (
	"net/http"
	"strconv"

	"github.com/LeoMengTCM/nox-api/common"
	"github.com/LeoMengTCM/nox-api/model"
	"github.com/LeoMengTCM/nox-api/service"
	"github.com/gin-gonic/gin"
)

// ==================== User Mission/Dispatch ====================

// GetMissions 获取可用任务列表
func GetMissions(c *gin.Context) {
	missions, err := model.GetAllMissions(true)
	if err != nil {
		common.ApiErrorMsg(c, "获取任务列表失败")
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    missions,
	})
}

// DispatchPet 派遣宠物执行任务
func DispatchPet(c *gin.Context) {
	var req struct {
		PetId     int `json:"pet_id"`
		MissionId int `json:"mission_id"`
	}
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}
	if req.PetId <= 0 || req.MissionId <= 0 {
		common.ApiErrorMsg(c, "无效的参数")
		return
	}

	userId := c.GetInt("id")
	result, err := service.DispatchPet(userId, req.PetId, req.MissionId)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "派遣成功",
		"data":    result,
	})
}

// GetDispatches 获取当前派遣列表（含自动完成检查）
func GetDispatches(c *gin.Context) {
	userId := c.GetInt("id")

	// Lazy completion: check and complete expired dispatches
	_, _ = service.CheckAndCompleteDispatches(userId)

	dispatches, err := model.GetActiveDispatches(userId)
	if err != nil {
		common.ApiErrorMsg(c, "获取派遣列表失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    dispatches,
	})
}

// CollectReward 领取派遣奖励
func CollectReward(c *gin.Context) {
	dispatchId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的派遣 ID")
		return
	}

	userId := c.GetInt("id")
	result, err := service.CollectReward(userId, dispatchId)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "领取成功",
		"data":    result,
	})
}

// GetDispatchHistory 获取派遣历史记录
func GetDispatchHistory(c *gin.Context) {
	userId := c.GetInt("id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	// Lazy completion: resolve any expired in_progress dispatches before returning history
	_, _ = service.CheckAndCompleteDispatches(userId)

	dispatches, total, err := model.GetDispatchHistory(userId, page, pageSize)
	if err != nil {
		common.ApiErrorMsg(c, "获取派遣历史失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"list":  dispatches,
			"total": total,
		},
	})
}

// ==================== Social / Public ====================

// GetPublicPets 获取其他用户的宠物展示
func GetPublicPets(c *gin.Context) {
	targetUserId, err := strconv.Atoi(c.Param("userId"))
	if err != nil || targetUserId <= 0 {
		common.ApiErrorMsg(c, "无效的用户 ID")
		return
	}

	result, err := service.GetPublicPetProfile(targetUserId)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// GetPetRanking 获取宠物排行榜
func GetPetRanking(c *gin.Context) {
	result, err := service.GetPetRanking()
	if err != nil {
		common.ApiErrorMsg(c, "获取排行榜失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// ==================== Admin Missions ====================

// AdminGetAllMissions 管理员获取所有任务
func AdminGetAllMissions(c *gin.Context) {
	missions, err := model.GetAllMissions(false)
	if err != nil {
		common.ApiErrorMsg(c, "获取任务列表失败")
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    missions,
	})
}

// AdminCreateMission 管理员创建任务
func AdminCreateMission(c *gin.Context) {
	var mission model.PetMission
	if err := common.DecodeJson(c.Request.Body, &mission); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}
	if mission.Name == "" {
		common.ApiErrorMsg(c, "任务名称不能为空")
		return
	}

	if err := model.CreateMission(&mission); err != nil {
		common.ApiErrorMsg(c, "创建任务失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    mission,
	})
}

// AdminUpdateMission 管理员更新任务
func AdminUpdateMission(c *gin.Context) {
	var mission model.PetMission
	if err := common.DecodeJson(c.Request.Body, &mission); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}
	if mission.Id == 0 {
		common.ApiErrorMsg(c, "任务 ID 不能为空")
		return
	}

	if err := model.UpdateMission(&mission); err != nil {
		common.ApiErrorMsg(c, "更新任务失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// AdminDeleteMission 管理员删除任务
func AdminDeleteMission(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的任务 ID")
		return
	}

	if err := model.DeleteMission(id); err != nil {
		common.ApiErrorMsg(c, "删除任务失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}
