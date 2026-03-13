package controller

import (
	"net/http"
	"strconv"

	"github.com/LeoMengTCM/nox-api/model"
	"github.com/gin-gonic/gin"
)

func GetRanking(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "20")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	hoarderRanking, err := model.GetHoarderRanking(limit)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "failed to get hoarder ranking",
		})
		return
	}

	aiKingRanking, err := model.GetAIKingRanking(limit)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "failed to get AI king ranking",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"hoarder": hoarderRanking,
			"ai_king": aiKingRanking,
		},
	})
}
