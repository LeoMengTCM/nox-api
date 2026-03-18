package model

import (
	"time"

	"github.com/LeoMengTCM/nox-api/common"
	"gorm.io/gorm"
)

// Title 称号定义
type Title struct {
	Id          int    `json:"id" gorm:"primaryKey;autoIncrement"`
	Key         string `json:"key" gorm:"type:varchar(50);uniqueIndex"`
	Name        string `json:"name" gorm:"type:varchar(64)"`
	Description string `json:"description" gorm:"type:varchar(255)"`
	Category    string `json:"category" gorm:"type:varchar(20)"` // casino, pet, heist, arena, social
	Rarity      string `json:"rarity" gorm:"type:varchar(8)"`    // N, R, SR, SSR
	Color       string `json:"color" gorm:"type:varchar(20)"`
	Condition   string `json:"condition" gorm:"type:text"` // JSON auto-grant condition
	SortOrder   int    `json:"sort_order" gorm:"default:0"`
	Enabled     bool   `json:"enabled" gorm:"default:true"`
	CreatedAt   int64  `json:"created_at" gorm:"bigint"`
}

func (Title) TableName() string {
	return "titles"
}

// UserTitle 用户已获得称号
type UserTitle struct {
	Id       int   `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId   int   `json:"user_id" gorm:"not null;uniqueIndex:idx_user_title"`
	TitleId  int   `json:"title_id" gorm:"not null;uniqueIndex:idx_user_title"`
	Equipped bool  `json:"equipped" gorm:"default:false"`
	EarnedAt int64 `json:"earned_at" gorm:"bigint"`
}

func (UserTitle) TableName() string {
	return "user_titles"
}

// ==================== Title CRUD ====================

func GetAllTitles() ([]Title, error) {
	var titles []Title
	err := DB.Where("enabled = ?", true).Order("sort_order asc, id asc").Find(&titles).Error
	return titles, err
}

func GetTitleByKey(key string) (*Title, error) {
	var title Title
	err := DB.Where(commonKeyCol+" = ?", key).First(&title).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &title, nil
}

func GetTitleById(id int) (*Title, error) {
	var title Title
	err := DB.First(&title, "id = ?", id).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &title, nil
}

// ==================== UserTitle CRUD ====================

func GetUserTitles(userId int) ([]map[string]interface{}, error) {
	var userTitles []UserTitle
	if err := DB.Where("user_id = ?", userId).Find(&userTitles).Error; err != nil {
		return nil, err
	}

	if len(userTitles) == 0 {
		return []map[string]interface{}{}, nil
	}

	titleIds := make([]int, len(userTitles))
	equippedMap := make(map[int]bool)
	earnedMap := make(map[int]int64)
	for i, ut := range userTitles {
		titleIds[i] = ut.TitleId
		equippedMap[ut.TitleId] = ut.Equipped
		earnedMap[ut.TitleId] = ut.EarnedAt
	}

	var titles []Title
	if err := DB.Where("id IN ?", titleIds).Find(&titles).Error; err != nil {
		return nil, err
	}

	results := make([]map[string]interface{}, len(titles))
	for i, t := range titles {
		results[i] = map[string]interface{}{
			"id":          t.Id,
			"key":         t.Key,
			"name":        t.Name,
			"description": t.Description,
			"category":    t.Category,
			"rarity":      t.Rarity,
			"color":       t.Color,
			"equipped":    equippedMap[t.Id],
			"earned_at":   earnedMap[t.Id],
		}
	}
	return results, nil
}

func HasUserTitle(userId int, titleId int) bool {
	var count int64
	DB.Model(&UserTitle{}).Where("user_id = ? AND title_id = ?", userId, titleId).Count(&count)
	return count > 0
}

func GrantTitle(userId int, titleId int) error {
	if HasUserTitle(userId, titleId) {
		return nil
	}
	ut := UserTitle{
		UserId:   userId,
		TitleId:  titleId,
		EarnedAt: time.Now().Unix(),
	}
	return DB.Create(&ut).Error
}

func EquipTitle(userId int, titleId int) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		// Unequip all
		if err := tx.Model(&UserTitle{}).Where("user_id = ? AND equipped = ?", userId, true).
			Update("equipped", false).Error; err != nil {
			return err
		}
		// Equip target
		if err := tx.Model(&UserTitle{}).Where("user_id = ? AND title_id = ?", userId, titleId).
			Update("equipped", true).Error; err != nil {
			return err
		}
		// Update user active_title_id
		return tx.Model(&User{}).Where("id = ?", userId).Update("active_title_id", titleId).Error
	})
}

func UnequipTitle(userId int) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&UserTitle{}).Where("user_id = ? AND equipped = ?", userId, true).
			Update("equipped", false).Error; err != nil {
			return err
		}
		return tx.Model(&User{}).Where("id = ?", userId).Update("active_title_id", 0).Error
	})
}

func GetUserActiveTitle(userId int) (*Title, error) {
	var user User
	if err := DB.Select("active_title_id").First(&user, "id = ?", userId).Error; err != nil {
		return nil, err
	}
	if user.ActiveTitleId == 0 {
		return nil, nil
	}
	return GetTitleById(user.ActiveTitleId)
}

// ==================== Seed Data ====================

func SeedTitles() {
	var count int64
	DB.Model(&Title{}).Count(&count)
	if count > 0 {
		return
	}

	now := time.Now().Unix()
	titles := []Title{
		{Key: "casino_newcomer", Name: "赌坊新客", Description: "首次在韦斯莱魔法赌坊下注", Category: "casino", Rarity: "N", Color: "#9CA3AF", Condition: `{"event":"first_bet"}`, SortOrder: 1, Enabled: true, CreatedAt: now},
		{Key: "lucky_star", Name: "幸运之星", Description: "在赌场连胜5局", Category: "casino", Rarity: "R", Color: "#60A5FA", Condition: `{"event":"win_streak","value":5}`, SortOrder: 2, Enabled: true, CreatedAt: now},
		{Key: "gambling_king", Name: "赌神", Description: "赌场累计盈利超过$10", Category: "casino", Rarity: "SSR", Color: "#F59E0B", Condition: `{"event":"total_profit","value":5000000}`, SortOrder: 3, Enabled: true, CreatedAt: now},
		{Key: "scatter_king", Name: "散财童子", Description: "赌场累计亏损超过$10", Category: "casino", Rarity: "SR", Color: "#F472B6", Condition: `{"event":"total_loss","value":5000000}`, SortOrder: 4, Enabled: true, CreatedAt: now},
		{Key: "whale", Name: "金鲸", Description: "赌场累计下注超过$100", Category: "casino", Rarity: "SSR", Color: "#F59E0B", Condition: `{"event":"total_wagered","value":50000000}`, SortOrder: 5, Enabled: true, CreatedAt: now},
		{Key: "streak_master", Name: "连胜大师", Description: "在赌场连胜10局", Category: "casino", Rarity: "SR", Color: "#A78BFA", Condition: `{"event":"win_streak","value":10}`, SortOrder: 6, Enabled: true, CreatedAt: now},
		{Key: "gringotts_thief", Name: "古灵阁大盗", Description: "成功打劫古灵阁3次", Category: "heist", Rarity: "SR", Color: "#A78BFA", Condition: `{"event":"heist_success","value":3}`, SortOrder: 10, Enabled: true, CreatedAt: now},
		{Key: "dark_lord", Name: "黑魔王", Description: "使用夺魂咒成功打劫古灵阁", Category: "heist", Rarity: "SSR", Color: "#F59E0B", Condition: `{"event":"imperio_success"}`, SortOrder: 11, Enabled: true, CreatedAt: now},
		{Key: "pet_master", Name: "神奇动物学家", Description: "拥有10只宠物", Category: "pet", Rarity: "R", Color: "#60A5FA", Condition: `{"event":"pet_count","value":10}`, SortOrder: 20, Enabled: true, CreatedAt: now},
		{Key: "ssr_collector", Name: "神兽收藏家", Description: "拥有3只SSR宠物", Category: "pet", Rarity: "SSR", Color: "#F59E0B", Condition: `{"event":"ssr_count","value":3}`, SortOrder: 21, Enabled: true, CreatedAt: now},
		{Key: "alchemist", Name: "炼金术士", Description: "完成10次宠物融合", Category: "pet", Rarity: "SR", Color: "#A78BFA", Condition: `{"event":"fusion_count","value":10}`, SortOrder: 22, Enabled: true, CreatedAt: now},
		{Key: "phoenix_tamer", Name: "凤凰守护者", Description: "拥有凤凰", Category: "pet", Rarity: "SSR", Color: "#F59E0B", Condition: `{"event":"own_phoenix"}`, SortOrder: 23, Enabled: true, CreatedAt: now},
		{Key: "arena_champion", Name: "擂台霸主", Description: "守擂10连胜", Category: "arena", Rarity: "SSR", Color: "#F59E0B", Condition: `{"event":"defense_streak","value":10}`, SortOrder: 30, Enabled: true, CreatedAt: now},
		{Key: "arena_challenger", Name: "挑战者", Description: "攻擂成功10次", Category: "arena", Rarity: "R", Color: "#60A5FA", Condition: `{"event":"attack_wins","value":10}`, SortOrder: 31, Enabled: true, CreatedAt: now},
		{Key: "first_blood", Name: "擂台初胜", Description: "首次攻擂成功", Category: "arena", Rarity: "N", Color: "#9CA3AF", Condition: `{"event":"first_attack_win"}`, SortOrder: 32, Enabled: true, CreatedAt: now},
		{Key: "social_butterfly", Name: "社交达人", Description: "粉丝超过50", Category: "social", Rarity: "R", Color: "#60A5FA", Condition: `{"event":"followers","value":50}`, SortOrder: 40, Enabled: true, CreatedAt: now},
	}

	for i := range titles {
		if err := DB.Create(&titles[i]).Error; err != nil {
			common.SysLog("seed title " + titles[i].Key + " failed: " + err.Error())
		}
	}
	common.SysLog("seeded 16 default titles")
}
