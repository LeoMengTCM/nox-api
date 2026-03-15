package service

import (
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"sort"

	"github.com/LeoMengTCM/nox-api/common"
	"github.com/LeoMengTCM/nox-api/model"
)

// PokerState stores the full state of a Texas Hold'em hand
type PokerState struct {
	Deck           []Card        `json:"deck"`
	CommunityCards []Card        `json:"community_cards"`
	Players        []PokerPlayer `json:"players"`
	Pot            int           `json:"pot"`
	CurrentBet     int           `json:"current_bet"`
	Phase          string        `json:"phase"` // preflop, flop, turn, river, showdown, complete
	ActivePlayer   int           `json:"active_player"`
	DealerIndex    int           `json:"dealer_index"`
	LastRaiser     int           `json:"last_raiser"`
}

// PokerPlayer represents a single player in the poker game
type PokerPlayer struct {
	Name     string `json:"name"`
	Cards    []Card `json:"cards"`
	Stack    int    `json:"stack"`
	Bet      int    `json:"bet"`       // current round bet
	TotalBet int    `json:"total_bet"` // total bet this hand
	Folded   bool   `json:"folded"`
	IsAI     bool   `json:"is_ai"`
	Style    string `json:"style"` // aggressive, conservative, balanced
	IsAllIn  bool   `json:"is_all_in"`
}

// Hand ranking constants
const (
	handHighCard      = 100
	handOnePair       = 200
	handTwoPair       = 300
	handThreeOfAKind  = 400
	handStraight      = 500
	handFlush         = 600
	handFullHouse     = 700
	handFourOfAKind   = 800
	handStraightFlush = 900
	handRoyalFlush    = 1000
)

// cardRankValue returns a numeric value for comparison (2=2, ..., A=14)
func cardRankValue(rank string) int {
	switch rank {
	case "2":
		return 2
	case "3":
		return 3
	case "4":
		return 4
	case "5":
		return 5
	case "6":
		return 6
	case "7":
		return 7
	case "8":
		return 8
	case "9":
		return 9
	case "10":
		return 10
	case "J":
		return 11
	case "Q":
		return 12
	case "K":
		return 13
	case "A":
		return 14
	}
	return 0
}

// newPokerDeck creates and shuffles a single 52-card deck
func newPokerDeck() []Card {
	deck := make([]Card, 0, 52)
	for _, suit := range suits {
		for _, rank := range ranks {
			deck = append(deck, Card{Rank: rank, Suit: suit})
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

// serializePokerState serializes poker state to JSON string
func serializePokerState(state *PokerState) string {
	data, _ := common.Marshal(state)
	return string(data)
}

// deserializePokerState deserializes poker state from JSON string
func deserializePokerState(details string) (*PokerState, error) {
	var state PokerState
	err := common.Unmarshal([]byte(details), &state)
	if err != nil {
		return nil, err
	}
	return &state, nil
}

// activePlayers returns the count of non-folded players
func activePlayers(state *PokerState) int {
	count := 0
	for _, p := range state.Players {
		if !p.Folded {
			count++
		}
	}
	return count
}

// nextActivePlayer finds the next non-folded, non-all-in player index
func nextActivePlayer(state *PokerState, from int) int {
	n := len(state.Players)
	for i := 1; i < n; i++ {
		idx := (from + i) % n
		p := state.Players[idx]
		if !p.Folded && !p.IsAllIn {
			return idx
		}
	}
	return from // all others folded or all-in
}

// DealPoker starts a new poker hand
func DealPoker(userId int, betAmount int) (map[string]interface{}, error) {
	// 检查是否有进行中的游戏
	active, err := model.GetActiveGame(userId, "poker")
	if err != nil {
		return nil, errors.New("查询游戏状态失败")
	}
	if active != nil {
		state, err := deserializePokerState(active.Details)
		if err != nil {
			return nil, errors.New("读取游戏状态失败")
		}
		return buildPokerResponse(active, state), nil
	}

	// 验证下注（bet = buy-in = big blind amount; stack = bet)
	if err := ValidateBet(userId, betAmount, "poker"); err != nil {
		return nil, err
	}

	// 扣款 (the bet is the user's buy-in)
	if err := PlaceBet(userId, betAmount); err != nil {
		return nil, err
	}

	// Create 4 players
	players := []PokerPlayer{
		{Name: "你", Stack: betAmount, IsAI: false, Style: ""},
		{Name: "弗雷德", Stack: betAmount, IsAI: true, Style: "aggressive"},
		{Name: "乔治", Stack: betAmount, IsAI: true, Style: "conservative"},
		{Name: "卢娜", Stack: betAmount, IsAI: true, Style: "balanced"},
	}

	// Shuffle and deal
	deck := newPokerDeck()
	for i := range players {
		players[i].Cards = []Card{deck[0], deck[1]}
		deck = deck[2:]
	}

	// Dealer is index 0 (user), small blind is index 1, big blind is index 2
	dealerIdx := 0
	smallBlindIdx := 1
	bigBlindIdx := 2

	bigBlind := betAmount / 10
	if bigBlind < 1 {
		bigBlind = 1
	}
	smallBlind := bigBlind / 2
	if smallBlind < 1 {
		smallBlind = 1
	}

	// Post blinds
	players[smallBlindIdx].Bet = smallBlind
	players[smallBlindIdx].TotalBet = smallBlind
	players[smallBlindIdx].Stack -= smallBlind

	players[bigBlindIdx].Bet = bigBlind
	players[bigBlindIdx].TotalBet = bigBlind
	players[bigBlindIdx].Stack -= bigBlind

	pot := smallBlind + bigBlind

	state := &PokerState{
		Deck:           deck,
		CommunityCards: []Card{},
		Players:        players,
		Pot:            pot,
		CurrentBet:     bigBlind,
		Phase:          "preflop",
		ActivePlayer:   3, // UTG = player after big blind (index 3)
		DealerIndex:    dealerIdx,
		LastRaiser:     bigBlindIdx,
	}

	// 创建游戏记录
	record := &model.CasinoGameRecord{
		UserId:   userId,
		GameType: "poker",
		BetAmount: betAmount,
		Status:   "active",
		Details:  serializePokerState(state),
	}
	if err := model.CreateGameRecord(record); err != nil {
		_ = model.IncreaseUserQuota(userId, betAmount, true)
		return nil, errors.New("创建游戏记录失败")
	}

	// Run AI turns until it's the user's turn (or hand ends)
	pokerRunAITurns(state)

	// Check if hand is over (everyone folded to one player)
	if activePlayers(state) == 1 {
		finishPokerHand(state)
	}

	// Save state
	record.Details = serializePokerState(state)
	_ = model.UpdateGameRecord(record)

	if state.Phase == "complete" {
		settlePoker(userId, record, state)
	}

	return buildPokerResponse(record, state), nil
}

// PokerAction handles a user's poker action
func PokerAction(userId int, gameId int, action string, raiseAmount int) (map[string]interface{}, error) {
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

	state, err := deserializePokerState(record.Details)
	if err != nil {
		return nil, errors.New("读取游戏状态失败")
	}

	if state.Phase == "complete" || state.Phase == "showdown" {
		return nil, errors.New("游戏已结束")
	}

	// Check it's the user's turn (user is index 0)
	if state.ActivePlayer != 0 {
		return nil, errors.New("当前不是你的回合")
	}

	player := &state.Players[0]
	if player.Folded {
		return nil, errors.New("你已经弃牌")
	}

	switch action {
	case "fold":
		player.Folded = true
	case "call":
		callAmount := state.CurrentBet - player.Bet
		if callAmount > player.Stack {
			callAmount = player.Stack
			player.IsAllIn = true
		}
		player.Stack -= callAmount
		player.Bet += callAmount
		player.TotalBet += callAmount
		state.Pot += callAmount
	case "raise":
		minRaise := state.CurrentBet * 2
		if raiseAmount < minRaise {
			return nil, fmt.Errorf("加注金额必须至少为 %d", minRaise)
		}
		if raiseAmount > player.Stack+player.Bet {
			return nil, errors.New("加注金额超过筹码")
		}
		needed := raiseAmount - player.Bet
		if needed > player.Stack {
			needed = player.Stack
			player.IsAllIn = true
		}
		player.Stack -= needed
		player.Bet += needed
		player.TotalBet += needed
		state.Pot += needed
		state.CurrentBet = player.Bet
		state.LastRaiser = 0
	case "allin":
		allInAmount := player.Stack
		player.Bet += allInAmount
		player.TotalBet += allInAmount
		state.Pot += allInAmount
		player.Stack = 0
		player.IsAllIn = true
		if player.Bet > state.CurrentBet {
			state.CurrentBet = player.Bet
			state.LastRaiser = 0
		}
	default:
		return nil, errors.New("无效的操作，可选: fold, call, raise, allin")
	}

	// Move to next player
	state.ActivePlayer = nextActivePlayer(state, 0)

	// Run AI turns
	pokerRunAITurns(state)

	// Check if hand is over
	if activePlayers(state) == 1 {
		finishPokerHand(state)
	} else {
		// Check if betting round is complete
		pokerCheckRoundComplete(state)
	}

	// Save state
	record.Details = serializePokerState(state)
	_ = model.UpdateGameRecord(record)

	if state.Phase == "complete" {
		settlePoker(userId, record, state)
	}

	return buildPokerResponse(record, state), nil
}

// pokerRunAITurns runs AI decisions until it's the user's turn or the round ends
func pokerRunAITurns(state *PokerState) {
	maxIterations := 20 // safety valve
	for i := 0; i < maxIterations; i++ {
		if state.Phase == "complete" || state.Phase == "showdown" {
			break
		}
		if activePlayers(state) <= 1 {
			break
		}

		ap := state.ActivePlayer
		player := &state.Players[ap]

		// If it's the user's turn, stop
		if !player.IsAI {
			break
		}

		if player.Folded || player.IsAllIn {
			state.ActivePlayer = nextActivePlayer(state, ap)
			continue
		}

		// AI makes decision
		action, amount := aiDecision(player, state)
		applyPokerAction(state, ap, action, amount)

		// Move to next player
		state.ActivePlayer = nextActivePlayer(state, ap)

		// Check if all active players have matched bets
		pokerCheckRoundComplete(state)
	}
}

// applyPokerAction applies an action for a given player index
func applyPokerAction(state *PokerState, playerIdx int, action string, amount int) {
	player := &state.Players[playerIdx]

	switch action {
	case "fold":
		player.Folded = true
	case "call":
		callAmount := state.CurrentBet - player.Bet
		if callAmount > player.Stack {
			callAmount = player.Stack
			player.IsAllIn = true
		}
		player.Stack -= callAmount
		player.Bet += callAmount
		player.TotalBet += callAmount
		state.Pot += callAmount
	case "raise":
		needed := amount - player.Bet
		if needed > player.Stack {
			needed = player.Stack
			player.IsAllIn = true
		}
		player.Stack -= needed
		player.Bet += needed
		player.TotalBet += needed
		state.Pot += needed
		state.CurrentBet = player.Bet
		state.LastRaiser = playerIdx
	case "allin":
		allIn := player.Stack
		player.Bet += allIn
		player.TotalBet += allIn
		state.Pot += allIn
		player.Stack = 0
		player.IsAllIn = true
		if player.Bet > state.CurrentBet {
			state.CurrentBet = player.Bet
			state.LastRaiser = playerIdx
		}
	}
}

// pokerCheckRoundComplete checks if the current betting round is complete and advances phase
func pokerCheckRoundComplete(state *PokerState) {
	if activePlayers(state) <= 1 {
		finishPokerHand(state)
		return
	}

	// Check if all non-folded, non-all-in players have matched the current bet
	allMatched := true
	activeNonAllIn := 0
	for i, p := range state.Players {
		if p.Folded {
			continue
		}
		if p.IsAllIn {
			continue
		}
		activeNonAllIn++
		if p.Bet < state.CurrentBet {
			allMatched = false
			break
		}
		// LastRaiser hasn't had everyone else respond yet
		if i == state.LastRaiser {
			continue
		}
	}

	// If only one non-all-in player remains and they've matched, or all have matched
	if !allMatched {
		return
	}

	// Check if we've gone around: the active player is back to the last raiser
	// or all players have acted
	ap := state.ActivePlayer
	if activeNonAllIn > 0 && ap != state.LastRaiser {
		// Still more players to act
		p := state.Players[ap]
		if !p.Folded && !p.IsAllIn && p.Bet < state.CurrentBet {
			return
		}
		// If the active player has matched but isn't the last raiser, keep going
		if !p.Folded && !p.IsAllIn && ap != state.LastRaiser {
			return
		}
	}

	// Advance phase
	advancePokerPhase(state)
}

// advancePokerPhase moves to the next phase and deals community cards
func advancePokerPhase(state *PokerState) {
	// Reset bets for new round
	for i := range state.Players {
		state.Players[i].Bet = 0
	}
	state.CurrentBet = 0

	switch state.Phase {
	case "preflop":
		// Deal flop (3 cards)
		if len(state.Deck) >= 3 {
			state.CommunityCards = append(state.CommunityCards, state.Deck[0], state.Deck[1], state.Deck[2])
			state.Deck = state.Deck[3:]
		}
		state.Phase = "flop"
	case "flop":
		// Deal turn (1 card)
		if len(state.Deck) >= 1 {
			state.CommunityCards = append(state.CommunityCards, state.Deck[0])
			state.Deck = state.Deck[1:]
		}
		state.Phase = "turn"
	case "turn":
		// Deal river (1 card)
		if len(state.Deck) >= 1 {
			state.CommunityCards = append(state.CommunityCards, state.Deck[0])
			state.Deck = state.Deck[1:]
		}
		state.Phase = "river"
	case "river":
		// Showdown
		finishPokerHand(state)
		return
	}

	// Set active player to first non-folded, non-all-in player after dealer
	state.LastRaiser = -1
	firstPlayer := nextActivePlayer(state, state.DealerIndex)
	state.ActivePlayer = firstPlayer
	state.LastRaiser = firstPlayer // acts as "everyone must act once"

	// If all remaining players are all-in, run through remaining cards
	allIn := true
	for _, p := range state.Players {
		if !p.Folded && !p.IsAllIn {
			allIn = false
			break
		}
	}
	if allIn {
		// Deal remaining community cards and go to showdown
		pokerDealRemaining(state)
		finishPokerHand(state)
	}
}

// pokerDealRemaining deals all remaining community cards (for all-in scenarios)
func pokerDealRemaining(state *PokerState) {
	for len(state.CommunityCards) < 5 && len(state.Deck) > 0 {
		state.CommunityCards = append(state.CommunityCards, state.Deck[0])
		state.Deck = state.Deck[1:]
	}
}

// finishPokerHand resolves the hand
func finishPokerHand(state *PokerState) {
	state.Phase = "complete"

	// If only one player left, they win the pot
	if activePlayers(state) == 1 {
		for i, p := range state.Players {
			if !p.Folded {
				state.Players[i].Stack += state.Pot
				state.Pot = 0
				break
			}
		}
		return
	}

	// Deal remaining community cards if needed
	pokerDealRemaining(state)

	// Evaluate all active players' hands
	type handResult struct {
		index    int
		score    int
		kickers  []int
	}

	var results []handResult
	for i, p := range state.Players {
		if p.Folded {
			continue
		}
		allCards := append([]Card{}, p.Cards...)
		allCards = append(allCards, state.CommunityCards...)
		score, kickers := evaluatePokerHand(allCards)
		results = append(results, handResult{i, score, kickers})
	}

	// Sort by score descending, then kickers
	sort.Slice(results, func(a, b int) bool {
		if results[a].score != results[b].score {
			return results[a].score > results[b].score
		}
		for k := 0; k < len(results[a].kickers) && k < len(results[b].kickers); k++ {
			if results[a].kickers[k] != results[b].kickers[k] {
				return results[a].kickers[k] > results[b].kickers[k]
			}
		}
		return false
	})

	// Find winner(s) — could be a tie
	winners := []int{results[0].index}
	for i := 1; i < len(results); i++ {
		if results[i].score == results[0].score && equalKickers(results[i].kickers, results[0].kickers) {
			winners = append(winners, results[i].index)
		} else {
			break
		}
	}

	// Split pot among winners
	share := state.Pot / len(winners)
	remainder := state.Pot % len(winners)
	for i, wIdx := range winners {
		bonus := share
		if i == 0 {
			bonus += remainder
		}
		state.Players[wIdx].Stack += bonus
	}
	state.Pot = 0
}

// equalKickers checks if two kicker slices are equal
func equalKickers(a, b []int) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

// evaluatePokerHand evaluates the best 5-card hand from 7 cards
// Returns (handRankScore, kickers) for comparison
func evaluatePokerHand(cards []Card) (int, []int) {
	// Get all values and suits
	values := make([]int, len(cards))
	suitCounts := map[string][]int{}
	valueCounts := map[int]int{}

	for i, c := range cards {
		v := cardRankValue(c.Rank)
		values[i] = v
		valueCounts[v]++
		suitCounts[c.Suit] = append(suitCounts[c.Suit], v)
	}

	// Sort values descending
	sort.Sort(sort.Reverse(sort.IntSlice(values)))

	// Check for flush (5+ cards of same suit)
	var flushSuit string
	var flushValues []int
	for suit, sv := range suitCounts {
		if len(sv) >= 5 {
			flushSuit = suit
			flushValues = make([]int, len(sv))
			copy(flushValues, sv)
			sort.Sort(sort.Reverse(sort.IntSlice(flushValues)))
			break
		}
	}
	_ = flushSuit

	// Check for straight (5 consecutive values)
	straightHigh := findStraightHigh(values)

	// Check for straight flush
	if len(flushValues) >= 5 {
		sfHigh := findStraightHigh(flushValues)
		if sfHigh > 0 {
			if sfHigh == 14 {
				return handRoyalFlush, []int{14}
			}
			return handStraightFlush, []int{sfHigh}
		}
	}

	// Count groups
	var fours, threes []int
	var pairs []int
	for v, count := range valueCounts {
		switch count {
		case 4:
			fours = append(fours, v)
		case 3:
			threes = append(threes, v)
		case 2:
			pairs = append(pairs, v)
		}
	}
	sort.Sort(sort.Reverse(sort.IntSlice(fours)))
	sort.Sort(sort.Reverse(sort.IntSlice(threes)))
	sort.Sort(sort.Reverse(sort.IntSlice(pairs)))

	// Four of a kind
	if len(fours) > 0 {
		kicker := highestExcluding(values, fours[0], 1)
		return handFourOfAKind, append([]int{fours[0]}, kicker...)
	}

	// Full house
	if len(threes) > 0 && (len(pairs) > 0 || len(threes) > 1) {
		tripleVal := threes[0]
		var pairVal int
		if len(threes) > 1 {
			pairVal = threes[1]
		}
		if len(pairs) > 0 && pairs[0] > pairVal {
			pairVal = pairs[0]
		}
		return handFullHouse, []int{tripleVal, pairVal}
	}

	// Flush
	if len(flushValues) >= 5 {
		return handFlush, flushValues[:5]
	}

	// Straight
	if straightHigh > 0 {
		return handStraight, []int{straightHigh}
	}

	// Three of a kind
	if len(threes) > 0 {
		kickers := highestExcluding(values, threes[0], 2)
		return handThreeOfAKind, append([]int{threes[0]}, kickers...)
	}

	// Two pair
	if len(pairs) >= 2 {
		kicker := highestExcludingMulti(values, []int{pairs[0], pairs[1]}, 1)
		return handTwoPair, append([]int{pairs[0], pairs[1]}, kicker...)
	}

	// One pair
	if len(pairs) == 1 {
		kickers := highestExcluding(values, pairs[0], 3)
		return handOnePair, append([]int{pairs[0]}, kickers...)
	}

	// High card
	return handHighCard, values[:5]
}

// findStraightHigh finds the highest straight from sorted values
func findStraightHigh(values []int) int {
	// Deduplicate
	unique := []int{}
	seen := map[int]bool{}
	for _, v := range values {
		if !seen[v] {
			seen[v] = true
			unique = append(unique, v)
		}
	}
	sort.Sort(sort.Reverse(sort.IntSlice(unique)))

	// Check for A-2-3-4-5 (wheel)
	if seen[14] && seen[2] && seen[3] && seen[4] && seen[5] {
		return 5 // 5-high straight
	}

	// Check normal straights
	for i := 0; i <= len(unique)-5; i++ {
		if unique[i]-unique[i+4] == 4 {
			consecutive := true
			for j := i; j < i+4; j++ {
				if unique[j]-unique[j+1] != 1 {
					consecutive = false
					break
				}
			}
			if consecutive {
				return unique[i]
			}
		}
	}

	return 0
}

// highestExcluding returns n highest values excluding a specific value
func highestExcluding(values []int, exclude int, n int) []int {
	result := []int{}
	for _, v := range values {
		if v != exclude {
			result = append(result, v)
			if len(result) == n {
				break
			}
		}
	}
	return result
}

// highestExcludingMulti returns n highest values excluding multiple values
func highestExcludingMulti(values []int, exclude []int, n int) []int {
	excSet := map[int]bool{}
	for _, e := range exclude {
		excSet[e] = true
	}
	result := []int{}
	for _, v := range values {
		if !excSet[v] {
			result = append(result, v)
			if len(result) == n {
				break
			}
		}
	}
	return result
}

// handStrength estimates hand strength as a score 0-100
func handStrength(player *PokerPlayer, community []Card) int {
	if len(community) == 0 {
		return preflopStrength(player.Cards)
	}

	allCards := append([]Card{}, player.Cards...)
	allCards = append(allCards, community...)
	score, _ := evaluatePokerHand(allCards)

	// Map hand rank to approximate 0-100 strength
	switch {
	case score >= handRoyalFlush:
		return 100
	case score >= handStraightFlush:
		return 97
	case score >= handFourOfAKind:
		return 93
	case score >= handFullHouse:
		return 85
	case score >= handFlush:
		return 78
	case score >= handStraight:
		return 70
	case score >= handThreeOfAKind:
		return 60
	case score >= handTwoPair:
		return 48
	case score >= handOnePair:
		return 35
	default:
		// High card — scale by kicker
		return 15
	}
}

// preflopStrength evaluates hole cards strength (0-100)
func preflopStrength(cards []Card) int {
	if len(cards) < 2 {
		return 20
	}

	v1 := cardRankValue(cards[0].Rank)
	v2 := cardRankValue(cards[1].Rank)
	if v1 < v2 {
		v1, v2 = v2, v1
	}

	suited := cards[0].Suit == cards[1].Suit

	// Pair
	if v1 == v2 {
		base := 50 + v1*2
		if base > 95 {
			base = 95
		}
		return base
	}

	// Premium hands
	if v1 == 14 && v2 >= 12 { // AK, AQ
		base := 75
		if suited {
			base += 5
		}
		return base
	}
	if v1 == 14 && v2 >= 10 { // AJ, AT
		base := 65
		if suited {
			base += 5
		}
		return base
	}

	// Suited connectors
	gap := v1 - v2
	if suited && gap == 1 {
		return 55 + v1
	}
	if suited && gap <= 2 {
		return 45 + v1
	}

	// High cards
	if v1 >= 12 && v2 >= 10 {
		base := 50
		if suited {
			base += 5
		}
		return base
	}

	// Medium suited
	if suited {
		return 30 + v1
	}

	// Generic
	return 15 + v1
}

// aiDecision makes a poker decision for an AI player
func aiDecision(player *PokerPlayer, state *PokerState) (string, int) {
	strength := handStrength(player, state.CommunityCards)

	// Determine thresholds based on style
	var raiseThresh, callThresh, bluffChance int

	switch player.Style {
	case "aggressive":
		raiseThresh = 30
		callThresh = 15
		bluffChance = 30
	case "conservative":
		raiseThresh = 60
		callThresh = 40
		bluffChance = 5
	default: // balanced
		raiseThresh = 45
		callThresh = 25
		bluffChance = 15
	}

	// Bluff check
	bluffRoll := cryptoRandN(100)
	isBluffing := bluffRoll < bluffChance && strength < callThresh

	callAmount := state.CurrentBet - player.Bet
	canCheck := callAmount == 0

	if isBluffing {
		// Bluff raise
		baseBet := state.CurrentBet
		if baseBet == 0 {
			baseBet = state.Pot / 4 // 无人下注时，以底池1/4作为基础
			if baseBet < 1 {
				baseBet = 1
			}
		}
		raiseSize := baseBet*2 + cryptoRandN(baseBet+1)
		if raiseSize > player.Stack+player.Bet {
			raiseSize = player.Stack + player.Bet
		}
		if raiseSize <= state.CurrentBet {
			if canCheck {
				return "call", 0
			}
			return "call", 0
		}
		return "raise", raiseSize
	}

	if strength >= raiseThresh {
		baseBet := state.CurrentBet
		if baseBet == 0 {
			baseBet = state.Pot / 4
			if baseBet < 1 {
				baseBet = 1
			}
		}
		raiseSize := baseBet*2 + cryptoRandN(baseBet+1)
		if raiseSize > player.Stack+player.Bet {
			raiseSize = player.Stack + player.Bet
		}
		if raiseSize <= state.CurrentBet {
			return "call", 0
		}
		return "raise", raiseSize
	}

	if strength >= callThresh || canCheck {
		return "call", 0
	}

	return "fold", 0
}

// cryptoRandN returns a crypto/rand random int in [0, n)
func cryptoRandN(n int) int {
	if n <= 0 {
		return 0
	}
	val, _ := rand.Int(rand.Reader, big.NewInt(int64(n)))
	return int(val.Int64())
}

// settlePoker settles the poker hand and pays out
func settlePoker(userId int, record *model.CasinoGameRecord, state *PokerState) {
	userStack := state.Players[0].Stack
	buyIn := record.BetAmount

	var resultStr string
	var payout int

	if userStack > buyIn {
		resultStr = "win"
		payout = userStack
	} else if userStack == buyIn {
		resultStr = "push"
		payout = buyIn
	} else if userStack > 0 {
		resultStr = "lose"
		payout = userStack
	} else {
		resultStr = "lose"
		payout = 0
	}

	record.Details = serializePokerState(state)
	_ = SettleBet(userId, record, resultStr, payout)
}

// buildPokerResponse constructs the API response, hiding AI cards when appropriate
func buildPokerResponse(record *model.CasinoGameRecord, state *PokerState) map[string]interface{} {
	players := make([]map[string]interface{}, len(state.Players))
	for i, p := range state.Players {
		pm := map[string]interface{}{
			"name":      p.Name,
			"stack":     p.Stack,
			"bet":       p.Bet,
			"total_bet": p.TotalBet,
			"folded":    p.Folded,
			"is_ai":     p.IsAI,
			"is_all_in": p.IsAllIn,
		}

		// Show cards: user always sees their own cards; AI cards visible only at showdown/complete
		if !p.IsAI {
			pm["cards"] = p.Cards
		} else if state.Phase == "complete" && !p.Folded {
			pm["cards"] = p.Cards
		} else {
			pm["cards"] = []Card{{Rank: "?", Suit: "?"}, {Rank: "?", Suit: "?"}}
		}

		// 在 showdown/complete 阶段为未弃牌玩家添加 hand_rank
		if (state.Phase == "showdown" || state.Phase == "complete") && !p.Folded && len(state.CommunityCards) > 0 {
			allCards := append([]Card{}, p.Cards...)
			allCards = append(allCards, state.CommunityCards...)
			score, _ := evaluatePokerHand(allCards)
			pm["hand_rank"] = handRankName(score)
		}

		players[i] = pm
	}

	response := map[string]interface{}{
		"game_id":         record.Id,
		"phase":           state.Phase,
		"community_cards": state.CommunityCards,
		"players":         players,
		"pot":             state.Pot,
		"current_bet":     state.CurrentBet,
		"active_player":   state.ActivePlayer,
		"bet_amount":      record.BetAmount,
		"status":          record.Status,
	}

	if state.Phase == "complete" {
		response["result"] = record.Result
		response["payout"] = record.Payout
		response["net_profit"] = record.NetProfit
		userStack := state.Players[0].Stack
		response["your_stack"] = userStack

		// Describe hand result
		if !state.Players[0].Folded && len(state.CommunityCards) > 0 {
			allCards := append([]Card{}, state.Players[0].Cards...)
			allCards = append(allCards, state.CommunityCards...)
			score, _ := evaluatePokerHand(allCards)
			response["your_hand"] = handRankName(score)
		}

		// 添加赢家名称
		for _, p := range state.Players {
			if !p.Folded && p.Stack > 0 {
				response["winner"] = p.Name
				break
			}
		}

		response["message"] = pokerResultMessage(record.Result, record.Payout, record.BetAmount)
	}

	return response
}

// handRankName returns a Chinese name for the hand rank
func handRankName(score int) string {
	switch {
	case score >= handRoyalFlush:
		return "皇家同花顺"
	case score >= handStraightFlush:
		return "同花顺"
	case score >= handFourOfAKind:
		return "四条"
	case score >= handFullHouse:
		return "葫芦"
	case score >= handFlush:
		return "同花"
	case score >= handStraight:
		return "顺子"
	case score >= handThreeOfAKind:
		return "三条"
	case score >= handTwoPair:
		return "两对"
	case score >= handOnePair:
		return "一对"
	default:
		return "高牌"
	}
}

// pokerResultMessage builds a Chinese result message
func pokerResultMessage(result string, payout, betAmount int) string {
	switch result {
	case "win":
		profit := payout - betAmount
		return fmt.Sprintf("恭喜！你赢得了 %d 筹码的利润！", profit)
	case "push":
		return "平局，退回买入"
	default:
		loss := betAmount - payout
		return fmt.Sprintf("你输了 %d 筹码", loss)
	}
}
