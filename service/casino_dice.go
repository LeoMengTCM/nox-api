package service

import (
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"

	"github.com/LeoMengTCM/nox-api/common"
	"github.com/LeoMengTCM/nox-api/model"
)

// rollDice 掷两个骰子 (crypto/rand)
func rollDice() (int, int) {
	n1, _ := rand.Int(rand.Reader, big.NewInt(6))
	n2, _ := rand.Int(rand.Reader, big.NewInt(6))
	return int(n1.Int64()) + 1, int(n2.Int64()) + 1
}

// diceExactPayout 精确数字赔率表
func diceExactPayout(total int) int {
	switch total {
	case 2, 12:
		return 16
	case 3, 11:
		return 8
	case 4, 10:
		return 6
	case 5, 9:
		return 4
	case 6, 8:
		return 3
	case 7:
		return 5
	default:
		return 0
	}
}

// PlayDice 掷骰子游戏
func PlayDice(userId int, betAmount int, betType string, betValue *int) (map[string]interface{}, error) {
	// 验证下注类型
	validTypes := map[string]bool{"big": true, "small": true, "lucky7": true, "exact": true}
	if !validTypes[betType] {
		return nil, errors.New("无效的下注类型，可选: big, small, lucky7, exact")
	}

	// exact 类型需要指定具体数字
	if betType == "exact" {
		if betValue == nil {
			return nil, errors.New("精确下注需要指定目标数字 (2-12)")
		}
		if *betValue < 2 || *betValue > 12 {
			return nil, errors.New("目标数字必须在 2-12 之间")
		}
	}

	// 验证下注
	if err := ValidateBet(userId, betAmount, "dice"); err != nil {
		return nil, err
	}

	// 扣款
	if err := PlaceBet(userId, betAmount); err != nil {
		return nil, err
	}

	// 掷骰子
	die1, die2 := rollDice()
	total := die1 + die2

	// 计算赔付
	var payout int
	var resultStr string

	switch betType {
	case "big":
		if total >= 8 {
			payout = betAmount * 2
			resultStr = "win"
		} else if total == 7 {
			payout = betAmount // push
			resultStr = "push"
		} else {
			payout = 0
			resultStr = "lose"
		}
	case "small":
		if total <= 6 {
			payout = betAmount * 2
			resultStr = "win"
		} else if total == 7 {
			payout = betAmount // push
			resultStr = "push"
		} else {
			payout = 0
			resultStr = "lose"
		}
	case "lucky7":
		if total == 7 {
			payout = betAmount * 5
			resultStr = "win"
		} else {
			payout = 0
			resultStr = "lose"
		}
	case "exact":
		if total == *betValue {
			multiplier := diceExactPayout(total)
			payout = betAmount * multiplier
			resultStr = "win"
		} else {
			payout = 0
			resultStr = "lose"
		}
	}

	// 构建详情
	details := map[string]interface{}{
		"die1":      die1,
		"die2":      die2,
		"total":     total,
		"bet_type":  betType,
		"bet_value": betValue,
	}
	detailsJSON, _ := common.Marshal(details)

	// 创建已完成的游戏记录
	record := &model.CasinoGameRecord{
		UserId:   userId,
		GameType: "dice",
		BetAmount: betAmount,
		Status:   "active", // will be set to completed by SettleBet
		Details:  string(detailsJSON),
	}
	if err := model.CreateGameRecord(record); err != nil {
		// 退款
		_ = model.IncreaseUserQuota(userId, betAmount, true)
		return nil, errors.New("创建游戏记录失败")
	}

	// 结算
	if err := SettleBet(userId, record, resultStr, payout); err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"game_id":    record.Id,
		"die1":       die1,
		"die2":       die2,
		"dice":       []int{die1, die2},
		"total":      total,
		"bet_type":   betType,
		"bet_value":  betValue,
		"bet_amount": betAmount,
		"result":     resultStr,
		"payout":     payout,
		"net_profit": payout - betAmount,
		"message":    diceResultMessage(die1, die2, total, resultStr, payout, betAmount),
	}, nil
}

// diceResultMessage 构建骰子结果消息
func diceResultMessage(die1, die2, total int, result string, payout, betAmount int) string {
	prefix := fmt.Sprintf("骰子结果: [%d] + [%d] = %d", die1, die2, total)
	switch result {
	case "win":
		return fmt.Sprintf("%s — 你赢了！", prefix)
	case "push":
		return fmt.Sprintf("%s — 平局，退回下注", prefix)
	default:
		return fmt.Sprintf("%s — 你输了", prefix)
	}
}
