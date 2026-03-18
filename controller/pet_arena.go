package controller

import (
	"net/http"
	"strconv"

	"github.com/LeoMengTCM/nox-api/common"
	"github.com/LeoMengTCM/nox-api/service"
	"github.com/gin-gonic/gin"
)

// GetArenaInfo 获取擂台信息
func GetArenaInfo(c *gin.Context) {
	userId := c.GetInt("id")
	info, err := service.GetArenaInfo(userId)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    info,
	})
}

// GetArenaRanking 获取擂台排名
func GetArenaRanking(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	ranking, total, err := service.GetArenaRanking(page, perPage)
	if err != nil {
		common.ApiErrorMsg(c, "获取排名失败")
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    ranking,
		"total":   total,
	})
}

// SetArenaDefender 设置守擂宠物
func SetArenaDefender(c *gin.Context) {
	userId := c.GetInt("id")
	var req struct {
		PetId int `json:"pet_id"`
	}
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}
	if req.PetId == 0 {
		common.ApiErrorMsg(c, "宠物 ID 不能为空")
		return
	}
	if err := service.SetDefender(userId, req.PetId); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "守擂宠物设置成功",
	})
}

// ArenaChallenge 攻擂
func ArenaChallenge(c *gin.Context) {
	userId := c.GetInt("id")
	var req struct {
		PetId          int `json:"pet_id"`
		DefenderUserId int `json:"defender_user_id"`
	}
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}
	if req.PetId == 0 || req.DefenderUserId == 0 {
		common.ApiErrorMsg(c, "参数不完整")
		return
	}

	result, err := service.Challenge(userId, req.PetId, req.DefenderUserId)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// GetBattleDetail 获取战斗详情
func GetBattleDetail(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的战斗 ID")
		return
	}
	battle, err := service.GetBattleById(id)
	if err != nil || battle == nil {
		common.ApiErrorMsg(c, "战斗记录不存在")
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    battle,
	})
}

// GetBattleHistory 获取我的战斗历史
func GetBattleHistory(c *gin.Context) {
	userId := c.GetInt("id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	battles, total, err := service.GetBattleHistory(userId, page, perPage)
	if err != nil {
		common.ApiErrorMsg(c, "获取战斗历史失败")
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    battles,
		"total":   total,
	})
}

// AdminManageSeason 管理赛季
func AdminManageSeason(c *gin.Context) {
	var req struct {
		Action string `json:"action"` // create, end
	}
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}
	result, err := service.ManageSeason(req.Action)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// AdminSettleSeason 手动结算赛季
func AdminSettleSeason(c *gin.Context) {
	result, err := service.SettleSeason()
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}
