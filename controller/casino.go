package controller

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/LeoMengTCM/nox-api/common"
	"github.com/LeoMengTCM/nox-api/model"
	"github.com/LeoMengTCM/nox-api/service"
	"github.com/LeoMengTCM/nox-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
)

// GetCasinoConfig 获取赌场配置
func GetCasinoConfig(c *gin.Context) {
	if !operation_setting.IsCasinoEnabled() {
		common.ApiErrorMsg(c, "赌场系统未启用")
		return
	}

	userId := c.GetInt("id")
	config, err := service.GetCasinoConfig(userId)
	if err != nil {
		common.ApiErrorMsg(c, "获取赌场配置失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    config,
	})
}

// GetMyCasinoStats 获取用户赌场统计
func GetMyCasinoStats(c *gin.Context) {
	if !operation_setting.IsCasinoEnabled() {
		common.ApiErrorMsg(c, "赌场系统未启用")
		return
	}

	userId := c.GetInt("id")
	stats, err := service.GetUserCasinoStats(userId)
	if err != nil {
		common.ApiErrorMsg(c, "获取统计数据失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

// GetCasinoHistory 获取游戏历史
func GetCasinoHistory(c *gin.Context) {
	if !operation_setting.IsCasinoEnabled() {
		common.ApiErrorMsg(c, "赌场系统未启用")
		return
	}

	userId := c.GetInt("id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	gameType := c.Query("game_type")

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	records, total, err := model.GetGameHistory(userId, gameType, page, perPage)
	if err != nil {
		common.ApiErrorMsg(c, "获取游戏历史失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"records":  records,
			"total":    total,
			"page":     page,
			"per_page": perPage,
		},
	})
}

// GetCasinoLeaderboard 获取排行榜
func GetCasinoLeaderboard(c *gin.Context) {
	if !operation_setting.IsCasinoEnabled() {
		common.ApiErrorMsg(c, "赌场系统未启用")
		return
	}

	rankType := c.DefaultQuery("type", "profit")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit < 1 || limit > 100 {
		limit = 20
	}

	leaderboard, err := model.GetCasinoLeaderboard(rankType, limit)
	if err != nil {
		common.ApiErrorMsg(c, "获取排行榜失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"rankings": leaderboard,
		},
	})
}

// DealBlackjack 发牌开始21点游戏
func DealBlackjack(c *gin.Context) {
	if !operation_setting.IsCasinoEnabled() {
		common.ApiErrorMsg(c, "赌场系统未启用")
		return
	}

	var req struct {
		Bet int `json:"bet"`
	}
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}

	userId := c.GetInt("id")
	result, err := service.DealBlackjack(userId, req.Bet)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// BlackjackAction 执行21点操作
func BlackjackAction(c *gin.Context) {
	if !operation_setting.IsCasinoEnabled() {
		common.ApiErrorMsg(c, "赌场系统未启用")
		return
	}

	var req struct {
		GameId int    `json:"game_id"`
		Action string `json:"action"`
	}
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}

	userId := c.GetInt("id")
	result, err := service.BlackjackAction(userId, req.GameId, req.Action)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// PlayDice 掷骰子
func PlayDice(c *gin.Context) {
	if !operation_setting.IsCasinoEnabled() {
		common.ApiErrorMsg(c, "赌场系统未启用")
		return
	}

	var req struct {
		Bet      int    `json:"bet"`
		BetType  string `json:"bet_type"`
		BetValue *int   `json:"bet_value"`
	}
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}

	userId := c.GetInt("id")
	result, err := service.PlayDice(userId, req.Bet, req.BetType, req.BetValue)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// PlayRoulette 轮盘赌
func PlayRoulette(c *gin.Context) {
	if !operation_setting.IsCasinoEnabled() {
		common.ApiErrorMsg(c, "赌场系统未启用")
		return
	}

	var req struct {
		Bet       int    `json:"bet"`
		BetType   string `json:"bet_type"`
		BetNumber *int   `json:"bet_number"`
	}
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}

	userId := c.GetInt("id")
	result, err := service.PlayRoulette(userId, req.Bet, req.BetType, req.BetNumber)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// PlayBaccarat 百家乐
func PlayBaccarat(c *gin.Context) {
	if !operation_setting.IsCasinoEnabled() {
		common.ApiErrorMsg(c, "赌场系统未启用")
		return
	}

	var req struct {
		Bet     int    `json:"bet"`
		BetType string `json:"bet_type"`
	}
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}

	userId := c.GetInt("id")
	result, err := service.PlayBaccarat(userId, req.Bet, req.BetType)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// PlaySlots 老虎机
func PlaySlots(c *gin.Context) {
	if !operation_setting.IsCasinoEnabled() {
		common.ApiErrorMsg(c, "赌场系统未启用")
		return
	}

	var req struct {
		Bet int `json:"bet"`
	}
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}

	userId := c.GetInt("id")
	result, err := service.PlaySlots(userId, req.Bet)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// DealPoker 发牌开始扑克游戏
func DealPoker(c *gin.Context) {
	if !operation_setting.IsCasinoEnabled() {
		common.ApiErrorMsg(c, "赌场系统未启用")
		return
	}

	var req struct {
		Bet int `json:"bet"`
	}
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}

	userId := c.GetInt("id")
	result, err := service.DealPoker(userId, req.Bet)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// PokerAction 执行扑克操作
func PokerAction(c *gin.Context) {
	if !operation_setting.IsCasinoEnabled() {
		common.ApiErrorMsg(c, "赌场系统未启用")
		return
	}

	var req struct {
		GameId      int    `json:"game_id"`
		Action      string `json:"action"`
		RaiseAmount int    `json:"raise_amount"`
	}
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}

	userId := c.GetInt("id")
	result, err := service.PokerAction(userId, req.GameId, req.Action, req.RaiseAmount)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// ==================== Admin ====================

// AdminGetCasinoStats 管理员获取赌场统计
func AdminGetCasinoStats(c *gin.Context) {
	stats, err := model.GetAdminCasinoStats()
	if err != nil {
		common.ApiErrorMsg(c, "获取赌场统计失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

// AdminGetCasinoUsers 管理员获取赌场用户列表
func AdminGetCasinoUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	search := c.Query("search")

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	users, total, err := model.GetAdminCasinoUsers(page, perPage, search)
	if err != nil {
		common.ApiErrorMsg(c, "获取赌场用户列表失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"users":    users,
			"total":    total,
			"page":     page,
			"per_page": perPage,
		},
	})
}

// AdminBanUser 管理员封禁/解封赌场用户
func AdminBanUser(c *gin.Context) {
	var req struct {
		UserId int  `json:"user_id"`
		Banned bool `json:"banned"`
	}
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}

	// 使用 options 表存储封禁状态: casino_ban.{user_id} = "true"/"false"
	optionKey := fmt.Sprintf("casino_ban.%d", req.UserId)
	if req.Banned {
		_ = model.UpdateOption(optionKey, "true")
	} else {
		_ = model.UpdateOption(optionKey, "false")
	}

	action := "解封"
	if req.Banned {
		action = "封禁"
	}
	model.RecordLog(req.UserId, model.LogTypeSystem, "管理员"+action+"赌场权限")

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": action + "成功",
	})
}

// AdminToggleGame 管理员开关游戏
func AdminToggleGame(c *gin.Context) {
	var req struct {
		Game    string `json:"game"`
		Enabled bool   `json:"enabled"`
	}
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}

	setting := operation_setting.GetCasinoSetting()
	var dbKey string
	switch req.Game {
	case "blackjack":
		setting.BlackjackEnabled = req.Enabled
		dbKey = "casino_setting.blackjack_enabled"
	case "dice":
		setting.DiceEnabled = req.Enabled
		dbKey = "casino_setting.dice_enabled"
	case "roulette":
		setting.RouletteEnabled = req.Enabled
		dbKey = "casino_setting.roulette_enabled"
	case "baccarat":
		setting.BaccaratEnabled = req.Enabled
		dbKey = "casino_setting.baccarat_enabled"
	case "slots":
		setting.SlotsEnabled = req.Enabled
		dbKey = "casino_setting.slots_enabled"
	case "poker":
		setting.PokerEnabled = req.Enabled
		dbKey = "casino_setting.poker_enabled"
	default:
		common.ApiErrorMsg(c, "未知的游戏类型")
		return
	}

	// 持久化到数据库
	_ = model.UpdateOption(dbKey, fmt.Sprintf("%v", req.Enabled))

	status := "关闭"
	if req.Enabled {
		status = "开启"
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": req.Game + " 已" + status,
	})
}

// GetAchievements 获取用户成就列表
func GetAchievements(c *gin.Context) {
	if !operation_setting.IsCasinoEnabled() {
		common.ApiErrorMsg(c, "赌场系统未启用")
		return
	}

	userId := c.GetInt("id")
	achievements, err := service.GetUserAchievementStatus(userId)
	if err != nil {
		common.ApiErrorMsg(c, "获取成就列表失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    achievements,
	})
}

// ClaimAchievement 领取成就奖励
func ClaimAchievement(c *gin.Context) {
	if !operation_setting.IsCasinoEnabled() {
		common.ApiErrorMsg(c, "赌场系统未启用")
		return
	}

	var req struct {
		AchievementId int `json:"achievement_id"`
	}
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}

	if req.AchievementId <= 0 {
		common.ApiErrorMsg(c, "无效的成就ID")
		return
	}

	userId := c.GetInt("id")
	result, err := service.ClaimAchievementReward(userId, req.AchievementId)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// ==================== Gringotts ====================

// GetGringottsInfo 获取古灵阁信息
func GetGringottsInfo(c *gin.Context) {
	if !operation_setting.IsCasinoEnabled() {
		common.ApiErrorMsg(c, "赌场系统未启用")
		return
	}

	userId := c.GetInt("id")
	info, err := service.GetGringottsInfo(userId)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    info,
	})
}

// ExecuteHeist 执行打劫
func ExecuteHeist(c *gin.Context) {
	if !operation_setting.IsCasinoEnabled() {
		common.ApiErrorMsg(c, "赌场系统未启用")
		return
	}

	var req struct {
		HeistType string `json:"heist_type"`
	}
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}

	userId := c.GetInt("id")
	result, err := service.ExecuteHeist(userId, req.HeistType)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// GetGringottsHistory 获取打劫历史
func GetGringottsHistory(c *gin.Context) {
	if !operation_setting.IsCasinoEnabled() {
		common.ApiErrorMsg(c, "赌场系统未启用")
		return
	}

	userId := c.GetInt("id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	records, total, err := service.GetHeistHistory(userId, page, perPage)
	if err != nil {
		common.ApiErrorMsg(c, "获取打劫历史失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"records":  records,
			"total":    total,
			"page":     page,
			"per_page": perPage,
		},
	})
}

// GetBigWins 获取大赢记录（跑马灯）
func GetBigWins(c *gin.Context) {
	if !operation_setting.IsCasinoEnabled() {
		common.ApiErrorMsg(c, "赌场系统未启用")
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit < 1 || limit > 100 {
		limit = 20
	}

	records, err := model.GetRecentBigWins(limit)
	if err != nil {
		common.ApiErrorMsg(c, "获取大赢记录失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    records,
	})
}
