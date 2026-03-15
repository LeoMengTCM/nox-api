package service

import (
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"

	"github.com/LeoMengTCM/nox-api/common"
	"github.com/LeoMengTCM/nox-api/model"
)

// baccaratCard 百家乐牌
type baccaratCard struct {
	Suit  string `json:"suit"`
	Rank  string `json:"rank"`
	Value int    `json:"value"`
}

// baccaratSuits 花色
var baccaratSuits = []string{"spades", "hearts", "diamonds", "clubs"}

// baccaratRanks 牌面及对应点数
var baccaratRanks = []struct {
	Rank  string
	Value int
}{
	{"A", 1}, {"2", 2}, {"3", 3}, {"4", 4}, {"5", 5},
	{"6", 6}, {"7", 7}, {"8", 8}, {"9", 9},
	{"10", 0}, {"J", 0}, {"Q", 0}, {"K", 0},
}

// baccaratBuildShoe 构建 8 副牌并洗牌 (Fisher-Yates, crypto/rand)
func baccaratBuildShoe() []baccaratCard {
	const numDecks = 8
	shoe := make([]baccaratCard, 0, numDecks*52)
	for d := 0; d < numDecks; d++ {
		for _, suit := range baccaratSuits {
			for _, r := range baccaratRanks {
				shoe = append(shoe, baccaratCard{
					Suit:  suit,
					Rank:  r.Rank,
					Value: r.Value,
				})
			}
		}
	}

	// Fisher-Yates shuffle with crypto/rand
	for i := len(shoe) - 1; i > 0; i-- {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(i+1)))
		j := int(n.Int64())
		shoe[i], shoe[j] = shoe[j], shoe[i]
	}
	return shoe
}

// baccaratHandTotal 计算手牌总点数 (mod 10)
func baccaratHandTotal(hand []baccaratCard) int {
	total := 0
	for _, c := range hand {
		total += c.Value
	}
	return total % 10
}

// baccaratFormatHand 格式化手牌用于返回
func baccaratFormatHand(hand []baccaratCard) []map[string]interface{} {
	result := make([]map[string]interface{}, len(hand))
	for i, c := range hand {
		result[i] = map[string]interface{}{
			"suit":  c.Suit,
			"rank":  c.Rank,
			"value": c.Value,
		}
	}
	return result
}

// baccaratDetermineWinner 判定赢家
func baccaratDetermineWinner(playerTotal, bankerTotal int) string {
	if playerTotal > bankerTotal {
		return "player"
	}
	if bankerTotal > playerTotal {
		return "banker"
	}
	return "tie"
}

// baccaratBankerDraws 庄家第三张牌规则
// bankerTotal: 庄家前两张总点数, playerThirdValue: 闲家第三张牌点数 (若无则 -1)
func baccaratBankerDraws(bankerTotal int, playerThirdValue int) bool {
	switch bankerTotal {
	case 0, 1, 2:
		return true
	case 3:
		return playerThirdValue != 8
	case 4:
		return playerThirdValue >= 2 && playerThirdValue <= 7
	case 5:
		return playerThirdValue >= 4 && playerThirdValue <= 7
	case 6:
		return playerThirdValue >= 6 && playerThirdValue <= 7
	default: // 7
		return false
	}
}

// PlayBaccarat 百家乐游戏 (8副牌)
func PlayBaccarat(userId int, betAmount int, betType string) (map[string]interface{}, error) {
	// 验证下注类型
	validTypes := map[string]bool{"player": true, "banker": true, "tie": true}
	if !validTypes[betType] {
		return nil, errors.New("无效的下注类型，可选: player, banker, tie")
	}

	// 验证下注
	if err := ValidateBet(userId, betAmount, "baccarat"); err != nil {
		return nil, err
	}

	// 扣款
	if err := PlaceBet(userId, betAmount); err != nil {
		return nil, err
	}

	// 构建牌靴并发牌
	shoe := baccaratBuildShoe()
	idx := 0

	drawCard := func() baccaratCard {
		c := shoe[idx]
		idx++
		return c
	}

	// 初始发牌: 闲1 庄1 闲2 庄2
	playerHand := []baccaratCard{drawCard(), drawCard()}
	bankerHand := []baccaratCard{drawCard(), drawCard()}
	// 交错发牌顺序修正：闲1, 庄1, 闲2, 庄2
	// 上面 drawCard 顺序: shoe[0]=闲1, shoe[1]=闲2, shoe[2]=庄1, shoe[3]=庄2
	// 需要调整为正确交错
	playerHand = []baccaratCard{shoe[0], shoe[2]}
	bankerHand = []baccaratCard{shoe[1], shoe[3]}
	idx = 4

	playerTotal := baccaratHandTotal(playerHand)
	bankerTotal := baccaratHandTotal(bankerHand)

	natural := false

	// 天牌判定 (Natural: 8或9)
	if playerTotal >= 8 || bankerTotal >= 8 {
		natural = true
	}

	playerThirdValue := -1 // 闲家无第三张

	if !natural {
		// 闲家补牌规则
		if playerTotal <= 5 {
			third := drawCard()
			playerHand = append(playerHand, third)
			playerTotal = baccaratHandTotal(playerHand)
			playerThirdValue = third.Value
		}

		// 庄家补牌规则
		if playerThirdValue == -1 {
			// 闲家未补牌：庄家 0-5 补牌，6-7 不补
			if bankerTotal <= 5 {
				bankerHand = append(bankerHand, drawCard())
				bankerTotal = baccaratHandTotal(bankerHand)
			}
		} else {
			// 闲家已补牌：按庄家补牌表
			if baccaratBankerDraws(bankerTotal, playerThirdValue) {
				bankerHand = append(bankerHand, drawCard())
				bankerTotal = baccaratHandTotal(bankerHand)
			}
		}
	}

	// 判定赢家
	winner := baccaratDetermineWinner(playerTotal, bankerTotal)

	// 计算赔付
	var payout int
	var resultStr string

	switch {
	case winner == "tie" && betType == "tie":
		// 押和赢: 9倍
		payout = betAmount * 9
		resultStr = "win"
	case winner == "tie" && (betType == "player" || betType == "banker"):
		// 押闲/庄但结果是和: 退回 (push)
		payout = betAmount
		resultStr = "push"
	case winner == betType && betType == "player":
		// 押闲赢: 2倍
		payout = betAmount * 2
		resultStr = "win"
	case winner == betType && betType == "banker":
		// 押庄赢: 1.95倍 (5%佣金), 用整数运算: betAmount * 195 / 100
		payout = betAmount * 195 / 100
		resultStr = "win"
	default:
		payout = 0
		resultStr = "lose"
	}

	// 构建详情
	details := map[string]interface{}{
		"player_cards": baccaratFormatHand(playerHand),
		"banker_cards": baccaratFormatHand(bankerHand),
		"player_total": playerTotal,
		"banker_total": bankerTotal,
		"winner":       winner,
		"natural":      natural,
		"bet_type":     betType,
	}
	detailsJSON, _ := common.Marshal(details)

	// 创建游戏记录
	record := &model.CasinoGameRecord{
		UserId:    userId,
		GameType:  "baccarat",
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
		"game_id":      record.Id,
		"player_cards": baccaratFormatHand(playerHand),
		"banker_cards": baccaratFormatHand(bankerHand),
		"player_total": playerTotal,
		"banker_total": bankerTotal,
		"winner":       winner,
		"natural":      natural,
		"bet_type":     betType,
		"bet_amount":   betAmount,
		"result":       resultStr,
		"payout":       payout,
		"net_profit":   payout - betAmount,
		"message":      baccaratResultMessage(playerTotal, bankerTotal, winner, resultStr, payout, betAmount),
	}, nil
}

// baccaratResultMessage 构建百家乐结果消息
func baccaratResultMessage(playerTotal, bankerTotal int, winner, result string, payout, betAmount int) string {
	winnerName := map[string]string{"player": "闲家", "banker": "庄家", "tie": "和局"}[winner]
	prefix := fmt.Sprintf("百家乐结果: 闲 %d vs 庄 %d — %s", playerTotal, bankerTotal, winnerName)
	switch result {
	case "win":
		return fmt.Sprintf("%s — 你赢了！赢得 %d", prefix, payout-betAmount)
	case "push":
		return fmt.Sprintf("%s — 和局，退回下注", prefix)
	default:
		return fmt.Sprintf("%s — 你输了", prefix)
	}
}
