package service

import (
	"errors"
	"fmt"
	"math"
	"math/rand"
	"time"

	"github.com/LeoMengTCM/nox-api/common"
	"github.com/LeoMengTCM/nox-api/logger"
	"github.com/LeoMengTCM/nox-api/model"
	"github.com/LeoMengTCM/nox-api/setting/operation_setting"
	"gorm.io/gorm"
)

// BattleRound 战斗回合
type BattleRound struct {
	Round         int    `json:"round"`
	Attacker      string `json:"attacker"` // "attacker" or "defender"
	Action        string `json:"action"`   // "attack", "crit", "dodge"
	Damage        int    `json:"damage"`
	AttackerHPPct int    `json:"attacker_hp_pct"` // 百分比
	DefenderHPPct int    `json:"defender_hp_pct"`
	Description   string `json:"description"`
}

// GetArenaInfo 获取擂台信息
func GetArenaInfo(userId int) (map[string]interface{}, error) {
	if !operation_setting.IsPetEnabled() || !operation_setting.IsArenaEnabled() {
		return nil, errors.New("竞技场未启用")
	}

	season, _ := model.GetActiveSeason()
	if season == nil {
		return nil, errors.New("当前没有活跃赛季")
	}

	myDefender, _ := model.GetDefender(userId)
	todayAttacks := model.GetTodayAttackCount(userId)
	maxAttacks := operation_setting.GetArenaAttacksPerDay()

	// 获取前20守擂者
	ranking, _ := model.GetArenaRanking(season.Id, 20)

	result := map[string]interface{}{
		"season":         season,
		"my_defender":    myDefender,
		"today_attacks":  todayAttacks,
		"max_attacks":    maxAttacks,
		"ranking":        ranking,
	}

	return result, nil
}

// SetDefender 设置守擂宠物
func SetDefender(userId int, petId int) error {
	if !operation_setting.IsPetEnabled() || !operation_setting.IsArenaEnabled() {
		return errors.New("竞技场未启用")
	}

	season, _ := model.GetActiveSeason()
	if season == nil {
		return errors.New("当前没有活跃赛季")
	}

	// 验证宠物
	pet, err := model.GetUserPetById(userId, petId)
	if err != nil {
		return errors.New("宠物不存在")
	}
	if pet.Stage < 2 {
		return errors.New("宠物需要成熟阶段才能参加擂台")
	}
	if pet.State != "normal" {
		return errors.New("宠物当前状态无法参加擂台")
	}

	defender := &model.PetArenaDefender{
		UserId:   userId,
		PetId:    petId,
		SeasonId: season.Id,
	}

	return model.CreateOrUpdateDefender(defender)
}

// Challenge 攻擂
func Challenge(attackerUserId int, attackerPetId int, defenderUserId int) (map[string]interface{}, error) {
	if !operation_setting.IsPetEnabled() || !operation_setting.IsArenaEnabled() {
		return nil, errors.New("竞技场未启用")
	}

	if attackerUserId == defenderUserId {
		return nil, errors.New("不能挑战自己")
	}

	season, _ := model.GetActiveSeason()
	if season == nil {
		return nil, errors.New("当前没有活跃赛季")
	}

	// 检查每日攻击次数
	todayAttacks := model.GetTodayAttackCount(attackerUserId)
	maxAttacks := operation_setting.GetArenaAttacksPerDay()
	if int(todayAttacks) >= maxAttacks {
		return nil, errors.New("今日攻擂次数已用完")
	}

	// 验证攻方宠物
	atkPet, err := model.GetUserPetById(attackerUserId, attackerPetId)
	if err != nil {
		return nil, errors.New("攻方宠物不存在")
	}
	if atkPet.Stage < 2 {
		return nil, errors.New("宠物需要成熟阶段才能参加擂台")
	}
	if atkPet.State != "normal" {
		return nil, errors.New("宠物当前状态无法参战")
	}

	// 获取守方信息
	defender, _ := model.GetDefender(defenderUserId)
	if defender == nil {
		return nil, errors.New("对方未设置守擂宠物")
	}

	defPet, err := model.GetUserPetById(defenderUserId, defender.PetId)
	if err != nil {
		return nil, errors.New("守方宠物不存在")
	}

	// 获取或创建攻方 defender 记录(用于追踪积分)
	atkDefender, _ := model.GetDefender(attackerUserId)
	if atkDefender == nil {
		atkDefender = &model.PetArenaDefender{
			UserId:   attackerUserId,
			PetId:    attackerPetId,
			Rating:   1000,
			SeasonId: season.Id,
		}
		_ = model.CreateOrUpdateDefender(atkDefender)
		atkDefender, _ = model.GetDefender(attackerUserId)
	}

	// 解析宠物属性
	atkStats := parsePetStats(atkPet)
	defStats := parsePetStats(defPet)

	// 获取宠物物种（用于元素克制）
	var atkSpecies, defSpecies model.PetSpecies
	model.DB.First(&atkSpecies, "id = ?", atkPet.SpeciesId)
	model.DB.First(&defSpecies, "id = ?", defPet.SpeciesId)

	// 模拟战斗
	rounds, winnerIsAttacker := simulateBattle(atkStats, defStats, atkSpecies.Element, defSpecies.Element)

	// 计算 Elo 积分变化
	ratingDiff := float64(defender.Rating - atkDefender.Rating)
	atkRatingBefore := atkDefender.Rating
	defRatingBefore := defender.Rating

	var atkRatingChange, defRatingChange int
	if winnerIsAttacker {
		atkRatingChange = int(30 * (1 + ratingDiff/500))
		if atkRatingChange < 5 {
			atkRatingChange = 5
		}
		defRatingChange = -int(20 * (1 + ratingDiff/500))
		if defRatingChange > -5 {
			defRatingChange = -5
		}
	} else {
		atkRatingChange = -int(20 * (1 - ratingDiff/500))
		if atkRatingChange > -5 {
			atkRatingChange = -5
		}
		defRatingChange = int(30 * (1 - ratingDiff/500))
		if defRatingChange < 5 {
			defRatingChange = 5
		}
	}

	atkDefender.Rating += atkRatingChange
	if atkDefender.Rating < 0 {
		atkDefender.Rating = 0
	}
	defender.Rating += defRatingChange
	if defender.Rating < 0 {
		defender.Rating = 0
	}

	// 计算奖励
	var rewardQuota int
	challengeHigher := ratingDiff >= 200

	if winnerIsAttacker {
		rewardQuota = 50000 // $0.10
		if challengeHigher {
			rewardQuota *= 2
		}

		// 攻方：+积分, +奖励, 宠物+30exp
		_ = model.IncreaseUserQuota(attackerUserId, rewardQuota, true)
		addPetExp(atkPet, 30)
		model.RecordLog(attackerUserId, model.LogTypeSystem, fmt.Sprintf("擂台攻擂胜利，获得 %s", logger.LogQuota(rewardQuota)))

		// 守方：-积分, 宠物+10exp
		addPetExp(defPet, 10)

		defender.LossCount++
		defender.WinStreak = 0
	} else {
		defReward := 20000 // $0.04
		rewardQuota = defReward

		// 守方：+积分(少), +奖励, 宠物+20exp
		_ = model.IncreaseUserQuota(defenderUserId, defReward, true)
		addPetExp(defPet, 20)

		defender.WinCount++
		defender.WinStreak++
		if defender.WinStreak > defender.MaxStreak {
			defender.MaxStreak = defender.WinStreak
		}

		// 每5连胜额外奖励
		if defender.WinStreak > 0 && defender.WinStreak%5 == 0 {
			bonus := 100000 // $0.20
			_ = model.IncreaseUserQuota(defenderUserId, bonus, true)
			model.RecordLog(defenderUserId, model.LogTypeSystem, fmt.Sprintf("擂台守擂%d连胜奖励 %s", defender.WinStreak, logger.LogQuota(bonus)))
		}

		// 攻方：-积分, 宠物+10exp
		addPetExp(atkPet, 10)
	}

	// 更新积分
	_ = model.UpdateDefender(atkDefender)
	_ = model.UpdateDefender(defender)

	// 序列化战斗日志
	roundsJSON, _ := common.Marshal(rounds)

	// 创建战斗记录
	battle := &model.PetArenaBattle{
		SeasonId:             season.Id,
		AttackerUserId:       attackerUserId,
		AttackerPetId:        attackerPetId,
		DefenderUserId:       defenderUserId,
		DefenderPetId:        defender.PetId,
		AttackerRatingBefore: atkRatingBefore,
		AttackerRatingAfter:  atkDefender.Rating,
		DefenderRatingBefore: defRatingBefore,
		DefenderRatingAfter:  defender.Rating,
		BattleLog:            string(roundsJSON),
		RewardQuota:          rewardQuota,
	}
	if winnerIsAttacker {
		battle.WinnerUserId = attackerUserId
	} else {
		battle.WinnerUserId = defenderUserId
	}
	_ = model.CreateBattle(battle)

	// 异步检查称号
	go func() {
		defer func() { recover() }()
		if winnerIsAttacker {
			// 统计攻方总胜利数
			var attackWins int64
			model.DB.Model(&model.PetArenaBattle{}).
				Where("attacker_user_id = ? AND winner_user_id = ?", attackerUserId, attackerUserId).
				Count(&attackWins)
			CheckArenaTitles(attackerUserId, true, int(attackWins), 0)
		} else {
			CheckArenaTitles(defenderUserId, false, 0, defender.WinStreak)
		}
	}()

	return map[string]interface{}{
		"battle_id":        battle.Id,
		"winner":           battle.WinnerUserId,
		"winner_is_attacker": winnerIsAttacker,
		"rounds":           rounds,
		"attacker_rating":  map[string]int{"before": atkRatingBefore, "after": atkDefender.Rating, "change": atkRatingChange},
		"defender_rating":  map[string]int{"before": defRatingBefore, "after": defender.Rating, "change": defRatingChange},
		"reward_quota":     rewardQuota,
	}, nil
}

// parsePetStats 解析宠物属性 JSON
func parsePetStats(pet *model.UserPet) map[string]int {
	stats := make(map[string]int)
	if pet.Stats != "" {
		_ = common.Unmarshal([]byte(pet.Stats), &stats)
	}
	// 确保有默认值
	if stats["attack"] == 0 {
		stats["attack"] = 10
	}
	if stats["defense"] == 0 {
		stats["defense"] = 10
	}
	if stats["speed"] == 0 {
		stats["speed"] = 10
	}
	if stats["luck"] == 0 {
		stats["luck"] = 10
	}
	return stats
}

// simulateBattle 模拟5回合战斗
func simulateBattle(atkStats, defStats map[string]int, atkElement, defElement string) ([]BattleRound, bool) {
	atkHP := (defStats["defense"]*2 + atkStats["attack"]) * 10 // 攻方 HP
	// Fix: HP 应该基于自身属性
	atkHP = (atkStats["defense"]*2 + atkStats["attack"]) * 10
	defHP := (defStats["defense"]*2 + defStats["attack"]) * 10
	atkMaxHP := atkHP
	defMaxHP := defHP

	// 元素克制
	atkElementBonus := 1.0
	defElementBonus := 1.0
	if counters(atkElement, defElement) {
		atkElementBonus = 1.15
	}
	if counters(defElement, atkElement) {
		defElementBonus = 1.15
	}

	var rounds []BattleRound

	for round := 1; round <= 5; round++ {
		// 速度决定先手
		atkFirst := atkStats["speed"] >= defStats["speed"]
		if atkStats["speed"] == defStats["speed"] {
			atkFirst = rand.Float64() < 0.5
		}

		type combatant struct {
			tag       string
			stats     map[string]int
			elemBonus float64
			hp        *int
			maxHP     int
			targetHP  *int
			targetMax int
			targetDef int
		}

		fighters := []combatant{
			{"attacker", atkStats, atkElementBonus, &atkHP, atkMaxHP, &defHP, defMaxHP, defStats["defense"]},
			{"defender", defStats, defElementBonus, &defHP, defMaxHP, &atkHP, atkMaxHP, atkStats["defense"]},
		}
		if !atkFirst {
			fighters[0], fighters[1] = fighters[1], fighters[0]
		}

		for _, f := range fighters {
			if *f.hp <= 0 || *f.targetHP <= 0 {
				continue
			}

			// 闪避率
			dodgeRate := math.Min(float64(f.stats["speed"])/float64(f.stats["speed"]+150), 0.2)
			if rand.Float64() < dodgeRate {
				rounds = append(rounds, BattleRound{
					Round: round, Attacker: f.tag, Action: "dodge", Damage: 0,
					AttackerHPPct: atkHP * 100 / atkMaxHP,
					DefenderHPPct: defHP * 100 / defMaxHP,
					Description:   "闪避了攻击！",
				})
				continue
			}

			// 伤害计算
			baseDmg := float64(f.stats["attack"]) * (1 + 0.1*rand.Float64()*float64(f.stats["luck"]))
			dmg := baseDmg - float64(f.targetDef)*0.5
			minDmg := baseDmg * 0.1
			if dmg < minDmg {
				dmg = minDmg
			}

			// 元素加成
			dmg *= f.elemBonus

			// 暴击
			action := "attack"
			critRate := math.Min(float64(f.stats["luck"])/float64(f.stats["luck"]+100), 0.3)
			if rand.Float64() < critRate {
				dmg *= 1.5
				action = "crit"
			}

			damage := int(math.Round(dmg))
			if damage < 1 {
				damage = 1
			}
			*f.targetHP -= damage
			if *f.targetHP < 0 {
				*f.targetHP = 0
			}

			desc := fmt.Sprintf("造成 %d 点伤害", damage)
			if action == "crit" {
				desc = "暴击！" + desc
			}

			rounds = append(rounds, BattleRound{
				Round: round, Attacker: f.tag, Action: action, Damage: damage,
				AttackerHPPct: atkHP * 100 / atkMaxHP,
				DefenderHPPct: defHP * 100 / defMaxHP,
				Description:   desc,
			})
		}

		// 检查是否有一方 HP 为 0
		if atkHP <= 0 || defHP <= 0 {
			break
		}
	}

	// 5回合后 HP 比例高者胜
	atkPct := float64(atkHP) / float64(atkMaxHP)
	defPct := float64(defHP) / float64(defMaxHP)
	winnerIsAttacker := atkPct > defPct
	if atkPct == defPct {
		winnerIsAttacker = rand.Float64() < 0.5
	}

	return rounds, winnerIsAttacker
}

// counters 元素克制: courage>ambition>wisdom>loyalty>courage
func counters(a, b string) bool {
	switch a {
	case "courage":
		return b == "ambition"
	case "ambition":
		return b == "wisdom"
	case "wisdom":
		return b == "loyalty"
	case "loyalty":
		return b == "courage"
	}
	return false
}

// addPetExp 给宠物加经验
func addPetExp(pet *model.UserPet, exp int) {
	pet.Exp += exp
	pet.UpdatedAt = time.Now().Unix()
	model.DB.Model(pet).Updates(map[string]interface{}{
		"exp":        pet.Exp,
		"updated_at": pet.UpdatedAt,
	})
}

// GetBattleById 获取战斗详情
func GetBattleById(id int) (*model.PetArenaBattle, error) {
	return model.GetBattleById(id)
}

// GetBattleHistory 获取用户战斗历史
func GetBattleHistory(userId int, page, perPage int) ([]model.PetArenaBattle, int64, error) {
	return model.GetUserBattleHistory(userId, page, perPage)
}

// GetArenaRanking 获取擂台排名
func GetArenaRanking(page, perPage int) ([]map[string]interface{}, int64, error) {
	season, _ := model.GetActiveSeason()
	seasonId := 0
	if season != nil {
		seasonId = season.Id
	}

	defenders, total, err := model.GetDefenderList(seasonId, perPage, (page-1)*perPage)
	if err != nil {
		return nil, 0, err
	}

	// 批量获取用户名
	userIds := make([]int, len(defenders))
	for i, d := range defenders {
		userIds[i] = d.UserId
	}
	usernameMap := batchGetUsernames(userIds)

	results := make([]map[string]interface{}, len(defenders))
	for i, d := range defenders {
		results[i] = map[string]interface{}{
			"rank":       (page-1)*perPage + i + 1,
			"user_id":    d.UserId,
			"username":   usernameMap[d.UserId],
			"pet_id":     d.PetId,
			"rating":     d.Rating,
			"win_count":  d.WinCount,
			"loss_count": d.LossCount,
			"win_streak": d.WinStreak,
			"max_streak": d.MaxStreak,
		}
	}
	return results, total, nil
}

func batchGetUsernames(userIds []int) map[int]string {
	result := make(map[int]string)
	if len(userIds) == 0 {
		return result
	}
	var users []struct {
		Id       int    `gorm:"column:id"`
		Username string `gorm:"column:username"`
	}
	model.DB.Table("users").Select("id, username").Where("id IN ?", userIds).Find(&users)
	for _, u := range users {
		result[u.Id] = u.Username
	}
	return result
}

// ManageSeason 创建/结束赛季
func ManageSeason(action string) (map[string]interface{}, error) {
	switch action {
	case "create":
		// 先结束当前活跃赛季
		current, _ := model.GetActiveSeason()
		if current != nil {
			_ = model.EndSeason(current.Id)
		}
		now := time.Now().Unix()
		days := operation_setting.GetArenaSeasonDays()
		season := &model.PetArenaSeason{
			Name:    fmt.Sprintf("第%d届三强争霸赛", time.Now().Year()),
			StartAt: now,
			EndAt:   now + int64(days)*24*3600,
			Status:  "active",
		}
		if err := model.CreateSeason(season); err != nil {
			return nil, err
		}
		return map[string]interface{}{"season": season}, nil

	case "end":
		current, _ := model.GetActiveSeason()
		if current == nil {
			return nil, errors.New("当前没有活跃赛季")
		}
		_ = model.EndSeason(current.Id)
		return map[string]interface{}{"ended_season_id": current.Id}, nil
	}
	return nil, errors.New("无效操作")
}

// SettleSeason 结算赛季奖励
func SettleSeason() (map[string]interface{}, error) {
	// 找到最近结束的赛季
	var season model.PetArenaSeason
	err := model.DB.Where("status = ?", "ended").Order("id desc").First(&season).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("没有已结束的赛季可结算")
		}
		return nil, err
	}

	defenders, _ := model.GetSeasonTopDefenders(season.Id, 50)
	rewards := make([]map[string]interface{}, 0)

	for i, d := range defenders {
		rank := i + 1
		var reward int
		switch {
		case rank == 1:
			reward = 5000000 // $10
			// 授予称号
			go func(uid int) {
				defer func() { recover() }()
				grantByKey(uid, "arena_champion")
			}(d.UserId)
		case rank <= 3:
			reward = 2000000 // $4
		case rank <= 10:
			reward = 1000000 // $2
		case rank <= 50:
			reward = 500000 // $1
		}

		if reward > 0 {
			_ = model.IncreaseUserQuota(d.UserId, reward, true)
			model.RecordLog(d.UserId, model.LogTypeSystem, fmt.Sprintf("擂台赛季结算 第%d名 奖励 %s", rank, logger.LogQuota(reward)))
			rewards = append(rewards, map[string]interface{}{
				"rank":    rank,
				"user_id": d.UserId,
				"reward":  reward,
			})
		}
	}

	// 重置积分: rating = (rating-1000)*0.5 + 1000
	allDefenders, _ := model.GetAllSeasonDefenders(season.Id)
	for _, d := range allDefenders {
		d.Rating = int(float64(d.Rating-1000)*0.5) + 1000
		if d.Rating < 0 {
			d.Rating = 0
		}
		d.WinCount = 0
		d.LossCount = 0
		d.WinStreak = 0
		_ = model.UpdateDefender(&d)
	}

	return map[string]interface{}{
		"season_id": season.Id,
		"rewards":   rewards,
		"settled":   len(rewards),
	}, nil
}
