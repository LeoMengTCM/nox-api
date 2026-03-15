package service

import (
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"

	"github.com/LeoMengTCM/nox-api/common"
	"github.com/LeoMengTCM/nox-api/model"
)

// rouletteRedNumbers 欧式轮盘红色数字
var rouletteRedNumbers = map[int]bool{
	1: true, 3: true, 5: true, 7: true, 9: true,
	12: true, 14: true, 16: true, 18: true, 19: true,
	21: true, 23: true, 25: true, 27: true, 30: true,
	32: true, 34: true, 36: true,
}

// rouletteValidBetTypes 合法下注类型
var rouletteValidBetTypes = map[string]bool{
	"number": true, "red": true, "black": true,
	"odd": true, "even": true, "high": true, "low": true,
	"dozen1": true, "dozen2": true, "dozen3": true,
	"column1": true, "column2": true, "column3": true,
}

// rouletteSpin 转轮盘 (crypto/rand, 0-36)
func rouletteSpin() int {
	n, _ := rand.Int(rand.Reader, big.NewInt(37))
	return int(n.Int64())
}

// rouletteNumberColor 返回数字颜色
func rouletteNumberColor(n int) string {
	if n == 0 {
		return "green"
	}
	if rouletteRedNumbers[n] {
		return "red"
	}
	return "black"
}

// rouletteCheckWin 检查是否中奖，返回赔率倍数 (0=未中)
func rouletteCheckWin(number int, betType string, betNumber *int) int {
	// 0 只有 number 押中 0 才赢
	if number == 0 {
		if betType == "number" && betNumber != nil && *betNumber == 0 {
			return 36
		}
		return 0
	}

	switch betType {
	case "number":
		if betNumber != nil && *betNumber == number {
			return 36
		}
		return 0

	case "red":
		if rouletteRedNumbers[number] {
			return 2
		}
		return 0

	case "black":
		if !rouletteRedNumbers[number] {
			return 2
		}
		return 0

	case "odd":
		if number%2 == 1 {
			return 2
		}
		return 0

	case "even":
		if number%2 == 0 {
			return 2
		}
		return 0

	case "low":
		if number >= 1 && number <= 18 {
			return 2
		}
		return 0

	case "high":
		if number >= 19 && number <= 36 {
			return 2
		}
		return 0

	case "dozen1":
		if number >= 1 && number <= 12 {
			return 3
		}
		return 0

	case "dozen2":
		if number >= 13 && number <= 24 {
			return 3
		}
		return 0

	case "dozen3":
		if number >= 25 && number <= 36 {
			return 3
		}
		return 0

	case "column1":
		if number%3 == 1 {
			return 3
		}
		return 0

	case "column2":
		if number%3 == 2 {
			return 3
		}
		return 0

	case "column3":
		if number%3 == 0 {
			return 3
		}
		return 0
	}

	return 0
}

// PlayRoulette 欧式轮盘游戏 (单零)
func PlayRoulette(userId int, betAmount int, betType string, betNumber *int) (map[string]interface{}, error) {
	// 验证下注类型
	if !rouletteValidBetTypes[betType] {
		return nil, errors.New("无效的下注类型，可选: number, red, black, odd, even, high, low, dozen1, dozen2, dozen3, column1, column2, column3")
	}

	// number 类型需要指定具体数字
	if betType == "number" {
		if betNumber == nil {
			return nil, errors.New("数字下注需要指定目标数字 (0-36)")
		}
		if *betNumber < 0 || *betNumber > 36 {
			return nil, errors.New("目标数字必须在 0-36 之间")
		}
	}

	// 验证下注
	if err := ValidateBet(userId, betAmount, "roulette"); err != nil {
		return nil, err
	}

	// 扣款
	if err := PlaceBet(userId, betAmount); err != nil {
		return nil, err
	}

	// 转轮盘
	winningNumber := rouletteSpin()
	color := rouletteNumberColor(winningNumber)

	// 计算赔付
	multiplier := rouletteCheckWin(winningNumber, betType, betNumber)
	var payout int
	var resultStr string
	if multiplier > 0 {
		payout = betAmount * multiplier
		resultStr = "win"
	} else {
		payout = 0
		resultStr = "lose"
	}

	// 构建详情
	details := map[string]interface{}{
		"winning_number": winningNumber,
		"color":          color,
		"bet_type":       betType,
		"bet_number":     betNumber,
	}
	detailsJSON, _ := common.Marshal(details)

	// 创建已完成的游戏记录
	record := &model.CasinoGameRecord{
		UserId:    userId,
		GameType:  "roulette",
		BetAmount: betAmount,
		Status:    "active",
		Details:   string(detailsJSON),
	}
	if err := model.CreateGameRecord(record); err != nil {
		_ = model.IncreaseUserQuota(userId, betAmount, true)
		return nil, errors.New("创建游戏记录失败")
	}

	// 结算
	if err := SettleBet(userId, record, resultStr, payout); err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"game_id":        record.Id,
		"winning_number": winningNumber,
		"color":          color,
		"bet_type":       betType,
		"bet_number":     betNumber,
		"bet_amount":     betAmount,
		"result":         resultStr,
		"payout":         payout,
		"net_profit":     payout - betAmount,
		"message":        rouletteResultMessage(winningNumber, color, resultStr, payout, betAmount),
	}, nil
}

// rouletteResultMessage 构建轮盘结果消息
func rouletteResultMessage(number int, color, result string, payout, betAmount int) string {
	prefix := fmt.Sprintf("轮盘结果: %d (%s)", number, color)
	switch result {
	case "win":
		return fmt.Sprintf("%s — 你赢了！赢得 %d", prefix, payout-betAmount)
	default:
		return fmt.Sprintf("%s — 你输了", prefix)
	}
}
