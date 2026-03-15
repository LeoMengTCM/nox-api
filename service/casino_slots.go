package service

import (
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"

	"github.com/LeoMengTCM/nox-api/common"
	"github.com/LeoMengTCM/nox-api/model"
)

// HP themed slot machine symbols (ordered by value, lowest to highest)
var slotSymbols = []string{
	"chocolate_frog", // 巧克力蛙
	"butterbeer",     // 黄油啤酒
	"sorting_hat",    // 分院帽
	"broomstick",     // 飞天扫帚
	"owl",            // 猫头鹰
	"phoenix",        // 凤凰
	"dragon",         // 火龙
	"golden_snitch",  // 金色飞贼
}

// Symbol weights (higher = more frequent)
var slotWeights = []int{
	30, // chocolate_frog
	25, // butterbeer
	20, // sorting_hat
	16, // broomstick
	12, // owl
	8,  // phoenix
	5,  // dragon
	2,  // golden_snitch
}

// totalSlotWeight is the sum of all slot weights
var totalSlotWeight int

func init() {
	for _, w := range slotWeights {
		totalSlotWeight += w
	}
}

// Payout multipliers for 3-of-a-kind on a payline
var slotPayouts = map[string]int{
	"chocolate_frog": 5,
	"butterbeer":     8,
	"sorting_hat":    12,
	"broomstick":     15,
	"owl":            20,
	"phoenix":        30,
	"dragon":         50,
	"golden_snitch":  100,
}

// 5 paylines defined as (row, col) positions in a 3x3 grid
var paylines = [5][3][2]int{
	{{0, 0}, {0, 1}, {0, 2}}, // Line 1: top row
	{{1, 0}, {1, 1}, {1, 2}}, // Line 2: middle row
	{{2, 0}, {2, 1}, {2, 2}}, // Line 3: bottom row
	{{0, 0}, {1, 1}, {2, 2}}, // Line 4: diagonal TL to BR
	{{2, 0}, {1, 1}, {0, 2}}, // Line 5: diagonal BL to TR
}

// weightedRandomSymbol picks a symbol using crypto/rand with weighted probabilities
func weightedRandomSymbol() string {
	n, _ := rand.Int(rand.Reader, big.NewInt(int64(totalSlotWeight)))
	roll := int(n.Int64())

	cumulative := 0
	for i, w := range slotWeights {
		cumulative += w
		if roll < cumulative {
			return slotSymbols[i]
		}
	}
	return slotSymbols[len(slotSymbols)-1]
}

// generateSlotGrid produces a 3x3 grid of weighted random symbols
func generateSlotGrid() [3][3]string {
	var grid [3][3]string
	for r := 0; r < 3; r++ {
		for c := 0; c < 3; c++ {
			grid[r][c] = weightedRandomSymbol()
		}
	}
	return grid
}

// checkPaylines evaluates all 5 paylines and returns winning info
func checkPaylines(grid [3][3]string, betAmount int) ([]map[string]interface{}, int) {
	var winningLines []map[string]interface{}
	totalPayout := 0

	for lineIdx, line := range paylines {
		s1 := grid[line[0][0]][line[0][1]]
		s2 := grid[line[1][0]][line[1][1]]
		s3 := grid[line[2][0]][line[2][1]]

		if s1 == s2 && s2 == s3 {
			multiplier := slotPayouts[s1]
			payout := betAmount * multiplier
			totalPayout += payout
			winningLines = append(winningLines, map[string]interface{}{
				"line":       lineIdx + 1,
				"symbols":    []string{s1, s2, s3},
				"symbol":     s1,
				"multiplier": multiplier,
				"payout":     payout,
			})
		}
	}

	return winningLines, totalPayout
}

// gridToSlice converts a 3x3 array to a slice-of-slices for JSON serialization
func gridToSlice(grid [3][3]string) [][]string {
	result := make([][]string, 3)
	for r := 0; r < 3; r++ {
		result[r] = make([]string, 3)
		for c := 0; c < 3; c++ {
			result[r][c] = grid[r][c]
		}
	}
	return result
}

// PlaySlots plays the HP-themed slot machine (instant game)
func PlaySlots(userId int, betAmount int) (map[string]interface{}, error) {
	// 验证下注
	if err := ValidateBet(userId, betAmount, "slots"); err != nil {
		return nil, err
	}

	// 扣款
	if err := PlaceBet(userId, betAmount); err != nil {
		return nil, err
	}

	// 执行所有旋转（包括免费旋转）
	var allGrids [][]string // flattened: each entry is a grid serialized for display
	var allWinningLines [][]map[string]interface{}
	totalPayout := 0
	freeSpinsAwarded := 0
	maxFreeSpins := 3
	spinsRemaining := 1 // first spin (the paid one)

	for spinsRemaining > 0 {
		spinsRemaining--

		grid := generateSlotGrid()
		winLines, spinPayout := checkPaylines(grid, betAmount)
		totalPayout += spinPayout

		gridSlice := gridToSlice(grid)
		allGrids = append(allGrids, flattenGrid(gridSlice))
		allWinningLines = append(allWinningLines, winLines)

		// Check for free spin: center cell (1,1) = golden_snitch
		if grid[1][1] == "golden_snitch" && freeSpinsAwarded < maxFreeSpins {
			freeSpinsAwarded++
			spinsRemaining++
		}
	}

	// Build result
	resultStr := "lose"
	if totalPayout > betAmount {
		resultStr = "win"
	} else if totalPayout == betAmount {
		resultStr = "push"
	} else if totalPayout > 0 {
		// partial win (payout > 0 but less than bet)
		resultStr = "lose"
	}

	// Build spin details for storage
	spins := make([]map[string]interface{}, len(allGrids))
	for i := range allGrids {
		spins[i] = map[string]interface{}{
			"grid":          allGrids[i],
			"winning_lines": allWinningLines[i],
		}
	}

	details := map[string]interface{}{
		"spins":        spins,
		"free_spins":   freeSpinsAwarded,
		"total_payout": totalPayout,
	}
	detailsJSON, _ := common.Marshal(details)

	// 创建游戏记录
	record := &model.CasinoGameRecord{
		UserId:   userId,
		GameType: "slots",
		BetAmount: betAmount,
		Status:   "active",
		Details:  string(detailsJSON),
	}
	if err := model.CreateGameRecord(record); err != nil {
		_ = model.IncreaseUserQuota(userId, betAmount, true)
		return nil, errors.New("创建游戏记录失败")
	}

	// 结算
	if err := SettleBet(userId, record, resultStr, totalPayout); err != nil {
		return nil, err
	}

	// Build response - reconstruct grids as 3x3 for the API response
	responseGrids := make([][][]string, len(allGrids))
	for i, flat := range allGrids {
		responseGrids[i] = unflattenGrid(flat)
	}

	// Primary grid is the first spin
	primaryGrid := responseGrids[0]

	response := map[string]interface{}{
		"game_id":          record.Id,
		"grid":             primaryGrid,
		"winning_paylines": allWinningLines[0],
		"bet_amount":       betAmount,
		"free_spins_count": freeSpinsAwarded,
		"free_spins":       freeSpinsAwarded,
		"total_payout":     totalPayout,
		"net_profit":       totalPayout - betAmount,
		"result":           resultStr,
		"message":          slotsResultMessage(resultStr, totalPayout, betAmount, freeSpinsAwarded),
	}

	// Include free spin grids if any
	if freeSpinsAwarded > 0 {
		freeSpinResults := make([]map[string]interface{}, 0, freeSpinsAwarded)
		for i := 1; i < len(responseGrids); i++ {
			freeSpinResults = append(freeSpinResults, map[string]interface{}{
				"grid":             responseGrids[i],
				"winning_paylines": allWinningLines[i],
			})
		}
		response["free_spin_grids"] = freeSpinResults
	}

	return response, nil
}

// flattenGrid converts a [][]string grid to a flat []string for storage
func flattenGrid(grid [][]string) []string {
	flat := make([]string, 0, 9)
	for _, row := range grid {
		flat = append(flat, row...)
	}
	return flat
}

// unflattenGrid converts a flat []string back to a 3x3 [][]string
func unflattenGrid(flat []string) [][]string {
	if len(flat) < 9 {
		return nil
	}
	grid := make([][]string, 3)
	for r := 0; r < 3; r++ {
		grid[r] = flat[r*3 : r*3+3]
	}
	return grid
}

// slotsResultMessage builds a Chinese result message for the slot machine
func slotsResultMessage(result string, payout, betAmount, freeSpins int) string {
	var prefix string
	if freeSpins > 0 {
		prefix = fmt.Sprintf("金色飞贼出现！获得 %d 次免费旋转！", freeSpins)
	}

	switch result {
	case "win":
		if prefix != "" {
			return fmt.Sprintf("%s 总计赢得奖金！", prefix)
		}
		return "恭喜！你赢了！"
	case "push":
		return "平局，退回下注"
	default:
		if prefix != "" {
			return fmt.Sprintf("%s 可惜没有赢得奖金", prefix)
		}
		return "没有中奖，再试试运气吧"
	}
}
