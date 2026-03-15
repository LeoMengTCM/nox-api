package service

import (
	"crypto/rand"
	"errors"
	"math/big"

	"github.com/LeoMengTCM/nox-api/common"
	"github.com/LeoMengTCM/nox-api/model"
)

// Card 扑克牌
type Card struct {
	Rank string `json:"rank"`
	Suit string `json:"suit"`
}

// BlackjackState 21点游戏状态
type BlackjackState struct {
	Deck        []Card   `json:"deck"`
	PlayerHands [][]Card `json:"player_hands"`
	DealerHand  []Card   `json:"dealer_hand"`
	CurrentHand int      `json:"current_hand"`
	Bets        []int    `json:"bets"`
	Phase       string   `json:"phase"`
}

var suits = []string{"spades", "hearts", "diamonds", "clubs"}
var ranks = []string{"A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"}

// newShuffledDeck 创建6副洗好的牌（312张）
func newShuffledDeck() []Card {
	deck := make([]Card, 0, 312)
	for shoe := 0; shoe < 6; shoe++ {
		for _, suit := range suits {
			for _, rank := range ranks {
				deck = append(deck, Card{Rank: rank, Suit: suit})
			}
		}
	}

	// Fisher-Yates shuffle with crypto/rand
	for i := len(deck) - 1; i > 0; i-- {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(i+1)))
		j := int(n.Int64())
		deck[i], deck[j] = deck[j], deck[i]
	}

	return deck
}

// cardValue 单张牌面值
func cardValue(rank string) int {
	switch rank {
	case "A":
		return 11
	case "K", "Q", "J":
		return 10
	default:
		val := 0
		for _, c := range rank {
			val = val*10 + int(c-'0')
		}
		return val
	}
}

// handValue 计算手牌点数
func handValue(cards []Card) (int, bool) {
	total := 0
	aces := 0
	for _, card := range cards {
		v := cardValue(card.Rank)
		total += v
		if card.Rank == "A" {
			aces++
		}
	}
	soft := aces > 0 && total <= 21
	for total > 21 && aces > 0 {
		total -= 10
		aces--
	}
	if aces == 0 {
		soft = false
	}
	return total, soft
}

// isBlackjack 是否天然21点
func isBlackjack(cards []Card) bool {
	if len(cards) != 2 {
		return false
	}
	val, _ := handValue(cards)
	return val == 21
}

// canSplit 是否可以分牌
func canSplit(cards []Card) bool {
	if len(cards) != 2 {
		return false
	}
	return cardValue(cards[0].Rank) == cardValue(cards[1].Rank)
}

// serializeState 序列化游戏状态
func serializeState(state *BlackjackState) string {
	data, _ := common.Marshal(state)
	return string(data)
}

// deserializeState 反序列化游戏状态
func deserializeState(details string) (*BlackjackState, error) {
	var state BlackjackState
	err := common.Unmarshal([]byte(details), &state)
	if err != nil {
		return nil, err
	}
	return &state, nil
}

// dealerVisible 返回庄家可见手牌（隐藏第二张）
func dealerVisible(hand []Card, phase string) []Card {
	if phase == "complete" || len(hand) <= 1 {
		return hand
	}
	return []Card{hand[0], {Rank: "?", Suit: "?"}}
}

// buildBlackjackResponse 构建21点响应
func buildBlackjackResponse(record *model.CasinoGameRecord, state *BlackjackState) map[string]interface{} {
	playerValues := make([]int, len(state.PlayerHands))
	for i, hand := range state.PlayerHands {
		playerValues[i], _ = handValue(hand)
	}
	dealerVal := 0
	if state.Phase == "complete" {
		dealerVal, _ = handValue(state.DealerHand)
	} else if len(state.DealerHand) > 0 {
		// 在游戏中只显示第一张牌的值
		v, _ := handValue(state.DealerHand[:1])
		dealerVal = v
	}

	// 前端期望 player_totals (数组) 和 player_total (第一手的值)
	playerTotal := 0
	if len(playerValues) > 0 {
		playerTotal = playerValues[0]
	}

	response := map[string]interface{}{
		"game_id":        record.Id,
		"phase":          state.Phase,
		"player_hands":   state.PlayerHands,
		"player_totals":  playerValues,
		"player_total":   playerTotal,
		"dealer_hand":    dealerVisible(state.DealerHand, state.Phase),
		"dealer_total":   dealerVal,
		"dealer_showing": cardValue(state.DealerHand[0].Rank),
		"current_hand":   state.CurrentHand,
		"bets":           state.Bets,
		"bet_amount":     record.BetAmount,
		"status":         record.Status,
	}

	if state.Phase == "complete" {
		response["result"] = record.Result
		response["payout"] = record.Payout
		response["net_profit"] = record.NetProfit
	}

	return response
}

// DealBlackjack 发牌开始21点游戏
func DealBlackjack(userId int, betAmount int) (map[string]interface{}, error) {
	// 检查是否有进行中的游戏
	active, err := model.GetActiveGame(userId, "blackjack")
	if err != nil {
		return nil, errors.New("查询游戏状态失败")
	}
	if active != nil {
		// 返回当前进行中的游戏
		state, err := deserializeState(active.Details)
		if err != nil {
			return nil, errors.New("读取游戏状态失败")
		}
		return buildBlackjackResponse(active, state), nil
	}

	// 验证下注
	if err := ValidateBet(userId, betAmount, "blackjack"); err != nil {
		return nil, err
	}

	// 扣款
	if err := PlaceBet(userId, betAmount); err != nil {
		return nil, err
	}

	// 创建牌组并发牌
	deck := newShuffledDeck()
	playerHand := []Card{deck[0], deck[2]}
	dealerHand := []Card{deck[1], deck[3]}
	deck = deck[4:]

	state := &BlackjackState{
		Deck:        deck,
		PlayerHands: [][]Card{playerHand},
		DealerHand:  dealerHand,
		CurrentHand: 0,
		Bets:        []int{betAmount},
		Phase:       "player_turn",
	}

	// 创建游戏记录
	record := &model.CasinoGameRecord{
		UserId:   userId,
		GameType: "blackjack",
		BetAmount: betAmount,
		Status:   "active",
		Details:  serializeState(state),
	}
	if err := model.CreateGameRecord(record); err != nil {
		// 退款
		_ = model.IncreaseUserQuota(userId, betAmount, true)
		return nil, errors.New("创建游戏记录失败")
	}

	// 检查天然21点
	playerBJ := isBlackjack(playerHand)
	dealerBJ := isBlackjack(dealerHand)

	if playerBJ || dealerBJ {
		state.Phase = "complete"
		var result string
		var payout int

		if playerBJ && dealerBJ {
			result = "push"
			payout = betAmount // 退回下注
		} else if playerBJ {
			result = "blackjack"
			payout = betAmount * 5 / 2 // 2.5x
		} else {
			result = "lose"
			payout = 0
		}

		record.Details = serializeState(state)
		if err := SettleBet(userId, record, result, payout); err != nil {
			return nil, err
		}
		return buildBlackjackResponse(record, state), nil
	}

	return buildBlackjackResponse(record, state), nil
}

// BlackjackAction 执行21点操作
func BlackjackAction(userId int, gameId int, action string) (map[string]interface{}, error) {
	record, err := model.GetGameRecordById(gameId)
	if err != nil || record == nil {
		return nil, errors.New("游戏不存在")
	}
	if record.UserId != userId {
		return nil, errors.New("无权操作此游戏")
	}
	if record.Status != "active" {
		return nil, errors.New("游戏已结束")
	}

	state, err := deserializeState(record.Details)
	if err != nil {
		return nil, errors.New("读取游戏状态失败")
	}

	if state.Phase != "player_turn" {
		return nil, errors.New("当前不在玩家回合")
	}

	currentIdx := state.CurrentHand
	if currentIdx >= len(state.PlayerHands) {
		return nil, errors.New("无效的手牌索引")
	}

	switch action {
	case "hit":
		if err := blackjackHit(state, currentIdx); err != nil {
			return nil, err
		}
	case "stand":
		blackjackStand(state)
	case "double":
		if err := blackjackDouble(userId, state, currentIdx, record); err != nil {
			return nil, err
		}
	case "split":
		if err := blackjackSplit(userId, state, currentIdx, record); err != nil {
			return nil, err
		}
	default:
		return nil, errors.New("无效的操作，可选: hit, stand, double, split")
	}

	// 检查是否所有手牌都已完成
	if state.Phase == "player_turn" {
		allDone := true
		for i := state.CurrentHand; i < len(state.PlayerHands); i++ {
			val, _ := handValue(state.PlayerHands[i])
			if val < 21 {
				allDone = false
				break
			}
		}
		if allDone || state.CurrentHand >= len(state.PlayerHands) {
			state.Phase = "dealer_turn"
		}
	}

	// 庄家回合
	if state.Phase == "dealer_turn" {
		blackjackDealerPlay(state)
		state.Phase = "complete"

		// 结算所有手牌
		totalPayout := blackjackSettleHands(state)
		record.BetAmount = totalBets(state.Bets)
		record.Details = serializeState(state)

		result := "lose"
		if totalPayout > record.BetAmount {
			result = "win"
		} else if totalPayout == record.BetAmount {
			result = "push"
		}

		if err := SettleBet(userId, record, result, totalPayout); err != nil {
			return nil, err
		}
		return buildBlackjackResponse(record, state), nil
	}

	// 保存中间状态
	record.Details = serializeState(state)
	_ = model.UpdateGameRecord(record)

	return buildBlackjackResponse(record, state), nil
}

// blackjackHit 要牌
func blackjackHit(state *BlackjackState, handIdx int) error {
	if len(state.Deck) == 0 {
		return errors.New("牌堆已空")
	}
	state.PlayerHands[handIdx] = append(state.PlayerHands[handIdx], state.Deck[0])
	state.Deck = state.Deck[1:]

	val, _ := handValue(state.PlayerHands[handIdx])
	if val >= 21 {
		// 爆牌或刚好21点，转到下一手
		state.CurrentHand++
	}
	return nil
}

// blackjackStand 停牌
func blackjackStand(state *BlackjackState) {
	state.CurrentHand++
}

// blackjackDouble 加倍
func blackjackDouble(userId int, state *BlackjackState, handIdx int, record *model.CasinoGameRecord) error {
	hand := state.PlayerHands[handIdx]
	if len(hand) != 2 {
		return errors.New("只能在前两张牌时加倍")
	}

	additionalBet := state.Bets[handIdx]
	// 验证并扣除额外下注
	if err := ValidateBet(userId, additionalBet, "blackjack"); err != nil {
		return err
	}
	if err := PlaceBet(userId, additionalBet); err != nil {
		return err
	}

	state.Bets[handIdx] *= 2

	// 发一张牌然后自动停牌
	if len(state.Deck) > 0 {
		state.PlayerHands[handIdx] = append(state.PlayerHands[handIdx], state.Deck[0])
		state.Deck = state.Deck[1:]
	}

	state.CurrentHand++
	return nil
}

// blackjackSplit 分牌
func blackjackSplit(userId int, state *BlackjackState, handIdx int, record *model.CasinoGameRecord) error {
	hand := state.PlayerHands[handIdx]
	if !canSplit(hand) {
		return errors.New("只能对点数相同的牌分牌")
	}
	if len(state.PlayerHands) > 1 {
		return errors.New("只能分牌一次")
	}

	additionalBet := state.Bets[handIdx]
	// 验证并扣除额外下注
	if err := ValidateBet(userId, additionalBet, "blackjack"); err != nil {
		return err
	}
	if err := PlaceBet(userId, additionalBet); err != nil {
		return err
	}

	// 分成两手
	hand1 := []Card{hand[0]}
	hand2 := []Card{hand[1]}

	// 各发一张牌
	if len(state.Deck) >= 2 {
		hand1 = append(hand1, state.Deck[0])
		hand2 = append(hand2, state.Deck[1])
		state.Deck = state.Deck[2:]
	}

	state.PlayerHands[handIdx] = hand1
	state.PlayerHands = append(state.PlayerHands, hand2)
	state.Bets = append(state.Bets, additionalBet)
	state.CurrentHand = handIdx

	return nil
}

// blackjackDealerPlay 庄家补牌（站17点）
func blackjackDealerPlay(state *BlackjackState) {
	for {
		val, soft := handValue(state.DealerHand)
		// 庄家在硬17或以上停牌，软17继续补牌 (H17规则)
		if val > 17 || (val == 17 && !soft) {
			break
		}
		if len(state.Deck) == 0 {
			break
		}
		state.DealerHand = append(state.DealerHand, state.Deck[0])
		state.Deck = state.Deck[1:]
	}
}

// blackjackSettleHands 结算所有手牌的赔付
func blackjackSettleHands(state *BlackjackState) int {
	dealerVal, _ := handValue(state.DealerHand)
	dealerBust := dealerVal > 21

	totalPayout := 0
	for i, hand := range state.PlayerHands {
		playerVal, _ := handValue(hand)
		bet := state.Bets[i]

		if playerVal > 21 {
			// 玩家爆牌
			continue
		}

		if dealerBust {
			// 庄家爆牌，玩家赢
			totalPayout += bet * 2
		} else if playerVal > dealerVal {
			totalPayout += bet * 2
		} else if playerVal == dealerVal {
			totalPayout += bet // 平局退回
		}
		// 玩家小于庄家: payout = 0
	}

	return totalPayout
}

// totalBets 计算总下注额
func totalBets(bets []int) int {
	total := 0
	for _, b := range bets {
		total += b
	}
	return total
}
