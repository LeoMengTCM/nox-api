package controller

import (
	"net/http"
	"strconv"

	"github.com/LeoMengTCM/nox-api/common"
	"github.com/LeoMengTCM/nox-api/model"
	"github.com/gin-gonic/gin"
)

// ==================== Admin Species ====================

// AdminGetAllSpecies 管理员获取所有物种
func AdminGetAllSpecies(c *gin.Context) {
	species, err := model.GetAllSpecies(false)
	if err != nil {
		common.ApiErrorMsg(c, "获取物种列表失败")
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    species,
	})
}

// AdminCreateSpecies 管理员创建物种
func AdminCreateSpecies(c *gin.Context) {
	var species model.PetSpecies
	if err := common.DecodeJson(c.Request.Body, &species); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}
	if species.Name == "" {
		common.ApiErrorMsg(c, "物种名称不能为空")
		return
	}

	if err := model.CreateSpecies(&species); err != nil {
		common.ApiErrorMsg(c, "创建物种失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    species,
	})
}

// AdminUpdateSpecies 管理员更新物种
func AdminUpdateSpecies(c *gin.Context) {
	var species model.PetSpecies
	if err := common.DecodeJson(c.Request.Body, &species); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}
	if species.Id == 0 {
		common.ApiErrorMsg(c, "物种 ID 不能为空")
		return
	}

	if err := model.UpdateSpecies(&species); err != nil {
		common.ApiErrorMsg(c, "更新物种失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// AdminDeleteSpecies 管理员删除物种
func AdminDeleteSpecies(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的物种 ID")
		return
	}

	if err := model.DeleteSpecies(id); err != nil {
		common.ApiErrorMsg(c, "删除物种失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// ==================== Admin Items ====================

// AdminGetAllItems 管理员获取所有物品
func AdminGetAllItems(c *gin.Context) {
	items, err := model.GetAllItems(false)
	if err != nil {
		common.ApiErrorMsg(c, "获取物品列表失败")
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    items,
	})
}

// AdminCreateItem 管理员创建物品
func AdminCreateItem(c *gin.Context) {
	var item model.PetItem
	if err := common.DecodeJson(c.Request.Body, &item); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}
	if item.Name == "" {
		common.ApiErrorMsg(c, "物品名称不能为空")
		return
	}

	if err := model.CreateItem(&item); err != nil {
		common.ApiErrorMsg(c, "创建物品失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    item,
	})
}

// AdminUpdateItem 管理员更新物品
func AdminUpdateItem(c *gin.Context) {
	var item model.PetItem
	if err := common.DecodeJson(c.Request.Body, &item); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}
	if item.Id == 0 {
		common.ApiErrorMsg(c, "物品 ID 不能为空")
		return
	}

	if err := model.UpdateItem(&item); err != nil {
		common.ApiErrorMsg(c, "更新物品失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// AdminDeleteItem 管理员删除物品
func AdminDeleteItem(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的物品 ID")
		return
	}

	if err := model.DeleteItem(id); err != nil {
		common.ApiErrorMsg(c, "删除物品失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}
