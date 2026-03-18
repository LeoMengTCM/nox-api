package controller

import (
	"net/http"

	"github.com/LeoMengTCM/nox-api/common"
	"github.com/LeoMengTCM/nox-api/service"
	"github.com/gin-gonic/gin"
)

// GetAllTitlesHandler 获取所有称号
func GetAllTitlesHandler(c *gin.Context) {
	titles, err := service.GetAllTitles()
	if err != nil {
		common.ApiErrorMsg(c, "获取称号列表失败")
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    titles,
	})
}

// GetMyTitlesHandler 获取我的称号
func GetMyTitlesHandler(c *gin.Context) {
	userId := c.GetInt("id")
	titles, err := service.GetMyTitles(userId)
	if err != nil {
		common.ApiErrorMsg(c, "获取我的称号失败")
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    titles,
	})
}

// EquipTitleHandler 佩戴称号
func EquipTitleHandler(c *gin.Context) {
	userId := c.GetInt("id")
	var req struct {
		TitleId int `json:"title_id"`
	}
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}
	if req.TitleId == 0 {
		common.ApiErrorMsg(c, "称号 ID 不能为空")
		return
	}
	if err := service.EquipTitle(userId, req.TitleId); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "称号佩戴成功",
	})
}

// UnequipTitleHandler 取消佩戴称号
func UnequipTitleHandler(c *gin.Context) {
	userId := c.GetInt("id")
	if err := service.UnequipTitle(userId); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "已取消佩戴称号",
	})
}
