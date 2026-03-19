package controller

import (
	"net/http"
	"strconv"

	"github.com/LeoMengTCM/nox-api/service"
	"github.com/gin-gonic/gin"
)

// ==================== User endpoints ====================

func GetBankInfo(c *gin.Context) {
	userId := c.GetInt("id")
	info, err := service.GetBankInfo(userId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": info})
}

func BankDemandDeposit(c *gin.Context) {
	userId := c.GetInt("id")
	var req struct {
		Amount int `json:"amount"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Amount <= 0 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "请输入有效金额"})
		return
	}
	result, err := service.DemandDeposit(userId, req.Amount)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

func BankDemandWithdraw(c *gin.Context) {
	userId := c.GetInt("id")
	var req struct {
		Amount int `json:"amount"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Amount <= 0 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "请输入有效金额"})
		return
	}
	result, err := service.DemandWithdraw(userId, req.Amount)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

func BankFixedDeposit(c *gin.Context) {
	userId := c.GetInt("id")
	var req struct {
		Amount int `json:"amount"`
		Term   int `json:"term"` // 7, 30, 90
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Amount <= 0 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "请输入有效金额"})
		return
	}
	result, err := service.CreateFixedDeposit(userId, req.Amount, req.Term)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

func BankFixedWithdraw(c *gin.Context) {
	userId := c.GetInt("id")
	var req struct {
		DepositId int `json:"deposit_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.DepositId <= 0 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "请输入有效存单ID"})
		return
	}
	result, err := service.WithdrawFixedDeposit(userId, req.DepositId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

func GetBankTransactions(c *gin.Context) {
	userId := c.GetInt("id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 50 {
		perPage = 20
	}

	txs, total, err := service.GetBankTransactions(userId, page, perPage)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"items": txs,
			"total": total,
		},
	})
}

// ==================== Admin endpoints ====================

func AdminGetBankStats(c *gin.Context) {
	stats := service.AdminGetBankStats()
	c.JSON(http.StatusOK, gin.H{"success": true, "data": stats})
}

func AdminBankInject(c *gin.Context) {
	var req struct {
		Amount int64  `json:"amount"`
		Action string `json:"action"` // "inject" or "withdraw"
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Amount <= 0 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "请输入有效金额"})
		return
	}
	if err := service.AdminInjectPool(req.Amount, req.Action); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "操作成功"})
}
