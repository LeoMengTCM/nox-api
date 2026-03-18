package service

import (
	"errors"

	"github.com/LeoMengTCM/nox-api/model"
)

// GetAllTitles 获取所有称号
func GetAllTitles() ([]model.Title, error) {
	return model.GetAllTitles()
}

// GetMyTitles 获取我的称号
func GetMyTitles(userId int) ([]map[string]interface{}, error) {
	return model.GetUserTitles(userId)
}

// EquipTitle 佩戴称号
func EquipTitle(userId int, titleId int) error {
	if !model.HasUserTitle(userId, titleId) {
		return errors.New("你还没有获得该称号")
	}
	return model.EquipTitle(userId, titleId)
}

// UnequipTitle 取消佩戴称号
func UnequipTitle(userId int) error {
	return model.UnequipTitle(userId)
}

// CheckCasinoTitles 检查赌场相关称号（在 SettleBet 后调用）
func CheckCasinoTitles(userId int, stats map[string]interface{}) {
	// casino_newcomer: 首次下注（只要有过游戏记录即可）
	grantByKey(userId, "casino_newcomer")

	// 从 stats 中获取数据
	totalWon, _ := stats["total_won"].(int64)
	totalLost, _ := stats["total_lost"].(int64)
	totalBet, _ := stats["total_bet"].(int64)

	netProfit := totalWon - totalLost

	// gambling_king: 累计盈利>$10 (5000000)
	if netProfit >= 5000000 {
		grantByKey(userId, "gambling_king")
	}

	// scatter_king: 累计亏损>$10 (5000000)
	if totalLost >= 5000000 {
		grantByKey(userId, "scatter_king")
	}

	// whale: 累计下注>$100 (50000000)
	if totalBet >= 50000000 {
		grantByKey(userId, "whale")
	}
}

// CheckWinStreakTitles 检查连胜称号
func CheckWinStreakTitles(userId int, streak int) {
	if streak >= 5 {
		grantByKey(userId, "lucky_star")
	}
	if streak >= 10 {
		grantByKey(userId, "streak_master")
	}
}

// CheckPetTitles 检查宠物相关称号
func CheckPetTitles(userId int) {
	var petCount int64
	model.DB.Model(&model.UserPet{}).Where("user_id = ?", userId).Count(&petCount)
	if petCount >= 10 {
		grantByKey(userId, "pet_master")
	}

	var ssrCount int64
	model.DB.Model(&model.UserPet{}).Where("user_id = ? AND rarity = ?", userId, "SSR").Count(&ssrCount)
	if ssrCount >= 3 {
		grantByKey(userId, "ssr_collector")
	}
}

// CheckArenaTitles 检查擂台相关称号
func CheckArenaTitles(userId int, isAttacker bool, attackWins int, defenseStreak int) {
	if isAttacker {
		if attackWins == 1 {
			grantByKey(userId, "first_blood")
		}
		if attackWins >= 10 {
			grantByKey(userId, "arena_challenger")
		}
	} else {
		if defenseStreak >= 10 {
			grantByKey(userId, "arena_champion")
		}
	}
}

func grantByKey(userId int, key string) {
	title, err := model.GetTitleByKey(key)
	if err != nil || title == nil {
		return
	}
	_ = model.GrantTitle(userId, title.Id)
}
