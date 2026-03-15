package model

import (
	"errors"
	"time"

	"github.com/LeoMengTCM/nox-api/common"
	"gorm.io/gorm"
)

// PetSpecies 宠物物种定义
type PetSpecies struct {
	Id              int    `json:"id" gorm:"primaryKey;autoIncrement"`
	Name            string `json:"name" gorm:"type:varchar(64);not null"`
	Description     string `json:"description" gorm:"type:varchar(255)"`
	Rarity          string `json:"rarity" gorm:"type:varchar(8);not null"` // N, R, SR, SSR
	Element         string `json:"element" gorm:"type:varchar(16)"`
	BaseStats       string `json:"base_stats" gorm:"type:text"`       // JSON: {hp, atk, def, spd, ...}
	EvolutionStages string `json:"evolution_stages" gorm:"type:text"` // JSON: [{stage, name, visual_key}, ...]
	VisualKey       string `json:"visual_key" gorm:"type:varchar(64)"`
	IsStarter       bool   `json:"is_starter" gorm:"default:false"`
	Enabled         bool   `json:"enabled" gorm:"default:true"`
	CreatedAt       int64  `json:"created_at" gorm:"bigint"`
	UpdatedAt       int64  `json:"updated_at" gorm:"bigint"`
}

func (PetSpecies) TableName() string {
	return "pet_species"
}

// UserPet 用户宠物实例
type UserPet struct {
	Id           int        `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId       int        `json:"user_id" gorm:"not null;index:idx_user_pet_user"`
	SpeciesId    int        `json:"species_id" gorm:"not null;index:idx_user_pet_species"`
	Nickname     string     `json:"nickname" gorm:"type:varchar(32)"`
	Level        int        `json:"level" gorm:"default:1"`
	Exp          int        `json:"exp" gorm:"default:0"`
	Stage        int        `json:"stage" gorm:"default:0"` // 0=蛋, 1=幼生, 2=成熟
	Star         int        `json:"star" gorm:"default:0"`
	Stats        string     `json:"stats" gorm:"type:text"` // JSON: current computed stats
	Status       string     `json:"status" gorm:"type:text"` // JSON: {hunger:100, mood:100, cleanliness:100}
	IsPrimary    bool       `json:"is_primary" gorm:"default:false"`
	State        string     `json:"state" gorm:"type:varchar(16);default:'normal'"` // normal, weak, dispatched, listed
	LastFedAt    *time.Time `json:"last_fed_at"`
	LastPlayedAt *time.Time `json:"last_played_at"`
	HatchedAt    *time.Time `json:"hatched_at"`
	CreatedAt    int64      `json:"created_at" gorm:"bigint"`
	UpdatedAt    int64      `json:"updated_at" gorm:"bigint"`
}

func (UserPet) TableName() string {
	return "user_pets"
}

// PetItem 物品定义
type PetItem struct {
	Id          int     `json:"id" gorm:"primaryKey;autoIncrement"`
	Name        string  `json:"name" gorm:"type:varchar(64);not null"`
	Description string  `json:"description" gorm:"type:varchar(255)"`
	Type        string  `json:"type" gorm:"type:varchar(16);not null"` // food, potion, material
	Rarity      string  `json:"rarity" gorm:"type:varchar(8)"`
	Effect      string  `json:"effect" gorm:"type:text"` // JSON: effect definition
	Price       float64 `json:"price" gorm:"default:0"`
	VisualKey   string  `json:"visual_key" gorm:"type:varchar(64)"`
	Enabled     bool    `json:"enabled" gorm:"default:true"`
	CreatedAt   int64   `json:"created_at" gorm:"bigint"`
	UpdatedAt   int64   `json:"updated_at" gorm:"bigint"`
}

func (PetItem) TableName() string {
	return "pet_items"
}

// UserPetItem 用户背包
type UserPetItem struct {
	Id        int   `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId    int   `json:"user_id" gorm:"not null;uniqueIndex:idx_user_item"`
	ItemId    int   `json:"item_id" gorm:"not null;uniqueIndex:idx_user_item"`
	Quantity  int   `json:"quantity" gorm:"default:0"`
	CreatedAt int64 `json:"created_at" gorm:"bigint"`
	UpdatedAt int64 `json:"updated_at" gorm:"bigint"`
}

func (UserPetItem) TableName() string {
	return "user_pet_items"
}

// ==================== PetSpecies CRUD ====================

func GetAllSpecies(enabledOnly bool) ([]PetSpecies, error) {
	var species []PetSpecies
	q := DB.Model(&PetSpecies{})
	if enabledOnly {
		q = q.Where("enabled = ?", true)
	}
	err := q.Order("id asc").Find(&species).Error
	return species, err
}

func GetSpeciesById(id int) (*PetSpecies, error) {
	var species PetSpecies
	err := DB.First(&species, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &species, nil
}

func GetStarterSpecies() ([]PetSpecies, error) {
	var species []PetSpecies
	err := DB.Where("is_starter = ? AND enabled = ?", true, true).Find(&species).Error
	return species, err
}

func CreateSpecies(species *PetSpecies) error {
	species.CreatedAt = time.Now().Unix()
	species.UpdatedAt = time.Now().Unix()
	return DB.Create(species).Error
}

func UpdateSpecies(species *PetSpecies) error {
	species.UpdatedAt = time.Now().Unix()
	return DB.Save(species).Error
}

func DeleteSpecies(id int) error {
	return DB.Delete(&PetSpecies{}, "id = ?", id).Error
}

// ==================== UserPet CRUD ====================

func GetUserPets(userId int) ([]UserPet, error) {
	var pets []UserPet
	err := DB.Where("user_id = ?", userId).Order("is_primary desc, id asc").Find(&pets).Error
	return pets, err
}

func GetUserPetById(userId int, petId int) (*UserPet, error) {
	var pet UserPet
	err := DB.Where("id = ? AND user_id = ?", petId, userId).First(&pet).Error
	if err != nil {
		return nil, err
	}
	return &pet, nil
}

func CreateUserPet(pet *UserPet) error {
	pet.CreatedAt = time.Now().Unix()
	pet.UpdatedAt = time.Now().Unix()
	return DB.Create(pet).Error
}

func UpdateUserPet(pet *UserPet) error {
	pet.UpdatedAt = time.Now().Unix()
	return DB.Save(pet).Error
}

func DeleteUserPet(userId int, petId int) error {
	result := DB.Where("id = ? AND user_id = ?", petId, userId).Delete(&UserPet{})
	if result.RowsAffected == 0 {
		return errors.New("宠物不存在或无权限")
	}
	return result.Error
}

func GetUserPetCount(userId int) (int64, error) {
	var count int64
	err := DB.Model(&UserPet{}).Where("user_id = ?", userId).Count(&count).Error
	return count, err
}

func HasAdoptedStarter(userId int) (bool, error) {
	var count int64
	// A starter pet is one whose species is marked is_starter
	err := DB.Model(&UserPet{}).
		Joins("JOIN pet_species ON pet_species.id = user_pets.species_id").
		Where("user_pets.user_id = ? AND pet_species.is_starter = ?", userId, true).
		Count(&count).Error
	return count > 0, err
}

func SetPrimaryPet(userId int, petId int) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		// Clear current primary
		if err := tx.Model(&UserPet{}).Where("user_id = ? AND is_primary = ?", userId, true).
			Update("is_primary", false).Error; err != nil {
			return err
		}
		// Set new primary
		result := tx.Model(&UserPet{}).Where("id = ? AND user_id = ?", petId, userId).
			Update("is_primary", true)
		if result.RowsAffected == 0 {
			return errors.New("宠物不存在或无权限")
		}
		return result.Error
	})
}

// GetUserPrimaryPet returns the user's primary pet, or nil if none exists
func GetUserPrimaryPet(userId int) (*UserPet, error) {
	var pet UserPet
	err := DB.Where("user_id = ? AND is_primary = ?", userId, true).First(&pet).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &pet, nil
}

// ==================== PetItem CRUD ====================

func GetAllItems(enabledOnly bool) ([]PetItem, error) {
	var items []PetItem
	q := DB.Model(&PetItem{})
	if enabledOnly {
		q = q.Where("enabled = ?", true)
	}
	err := q.Order("id asc").Find(&items).Error
	return items, err
}

func GetItemById(id int) (*PetItem, error) {
	var item PetItem
	err := DB.First(&item, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func CreateItem(item *PetItem) error {
	item.CreatedAt = time.Now().Unix()
	item.UpdatedAt = time.Now().Unix()
	return DB.Create(item).Error
}

func UpdateItem(item *PetItem) error {
	item.UpdatedAt = time.Now().Unix()
	return DB.Save(item).Error
}

func DeleteItem(id int) error {
	return DB.Delete(&PetItem{}, "id = ?", id).Error
}

// GetEnabledFoodItems returns all enabled items of type "food"
func GetEnabledFoodItems() ([]PetItem, error) {
	var items []PetItem
	err := DB.Where("enabled = ? AND type = ?", true, "food").Find(&items).Error
	return items, err
}

// ==================== UserPetItem CRUD ====================

func GetUserInventory(userId int) ([]UserPetItem, error) {
	var items []UserPetItem
	err := DB.Where("user_id = ? AND quantity > 0", userId).Find(&items).Error
	return items, err
}

func GetUserItem(userId int, itemId int) (*UserPetItem, error) {
	var item UserPetItem
	err := DB.Where("user_id = ? AND item_id = ?", userId, itemId).First(&item).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &item, nil
}

func AddUserItem(userId int, itemId int, quantity int) error {
	if quantity <= 0 {
		return errors.New("数量必须大于0")
	}
	var existing UserPetItem
	err := DB.Where("user_id = ? AND item_id = ?", userId, itemId).First(&existing).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Create new record
			newItem := UserPetItem{
				UserId:    userId,
				ItemId:    itemId,
				Quantity:  quantity,
				CreatedAt: time.Now().Unix(),
				UpdatedAt: time.Now().Unix(),
			}
			return DB.Create(&newItem).Error
		}
		return err
	}
	// Update existing record
	return DB.Model(&existing).Updates(map[string]interface{}{
		"quantity":   gorm.Expr("quantity + ?", quantity),
		"updated_at": time.Now().Unix(),
	}).Error
}

func RemoveUserItem(userId int, itemId int, quantity int) error {
	if quantity <= 0 {
		return errors.New("数量必须大于0")
	}
	var existing UserPetItem
	err := DB.Where("user_id = ? AND item_id = ?", userId, itemId).First(&existing).Error
	if err != nil {
		return errors.New("物品不存在")
	}
	if existing.Quantity < quantity {
		return errors.New("物品数量不足")
	}
	if existing.Quantity == quantity {
		return DB.Delete(&existing).Error
	}
	return DB.Model(&existing).Updates(map[string]interface{}{
		"quantity":   gorm.Expr("quantity - ?", quantity),
		"updated_at": time.Now().Unix(),
	}).Error
}

// mustMarshal marshals v to JSON string, panics on error (for seed data only).
func mustMarshal(v any) string {
	data, err := common.Marshal(v)
	if err != nil {
		panic("seed data marshal error: " + err.Error())
	}
	return string(data)
}

// SeedPetData populates initial pet species and items if the tables are empty.
// This function is idempotent — it only inserts when pet_species has zero rows.
func SeedPetData() {
	var count int64
	DB.Model(&PetSpecies{}).Count(&count)
	if count > 0 {
		return
	}

	common.SysLog("seeding initial pet species and items...")
	now := time.Now().Unix()

	species := []PetSpecies{
		// ══════ N-Starter (4) ══════
		{
			Name: "嗅嗅", Description: "喜欢发光的东西，能偷金币，调皮可爱",
			Rarity: "N", Element: "loyalty", VisualKey: "niffler", IsStarter: true, Enabled: true,
			BaseStats:       mustMarshal(map[string]int{"attack": 8, "defense": 12, "speed": 8, "luck": 12}),
			EvolutionStages: mustMarshal([]map[string]any{{"stage": 0, "name": "嗅嗅蛋"}, {"stage": 1, "name": "小嗅嗅"}, {"stage": 2, "name": "黄金嗅嗅"}}),
			CreatedAt: now, UpdatedAt: now,
		},
		{
			Name: "护树罗锅", Description: "树枝形态的小生物，胆小但忠诚",
			Rarity: "N", Element: "loyalty", VisualKey: "bowtruckle", IsStarter: true, Enabled: true,
			BaseStats:       mustMarshal(map[string]int{"attack": 6, "defense": 14, "speed": 10, "luck": 10}),
			EvolutionStages: mustMarshal([]map[string]any{{"stage": 0, "name": "护树蛋"}, {"stage": 1, "name": "小罗锅"}, {"stage": 2, "name": "古树守卫"}}),
			CreatedAt: now, UpdatedAt: now,
		},
		{
			Name: "隐形兽", Description: "能隐身和预知未来，银色长毛",
			Rarity: "N", Element: "wisdom", VisualKey: "demiguise", IsStarter: true, Enabled: true,
			BaseStats:       mustMarshal(map[string]int{"attack": 6, "defense": 10, "speed": 10, "luck": 14}),
			EvolutionStages: mustMarshal([]map[string]any{{"stage": 0, "name": "隐形蛋"}, {"stage": 1, "name": "小隐兽"}, {"stage": 2, "name": "银雾先知"}}),
			CreatedAt: now, UpdatedAt: now,
		},
		{
			Name: "蒲绒绒", Description: "圆滚滚的绒毛球，舌头超长，最佳伴侣",
			Rarity: "N", Element: "loyalty", VisualKey: "puffskein", IsStarter: true, Enabled: true,
			BaseStats:       mustMarshal(map[string]int{"attack": 6, "defense": 12, "speed": 8, "luck": 14}),
			EvolutionStages: mustMarshal([]map[string]any{{"stage": 0, "name": "绒毛蛋"}, {"stage": 1, "name": "小绒球"}, {"stage": 2, "name": "皇家蒲绒"}}),
			CreatedAt: now, UpdatedAt: now,
		},
		// ══════ N-Gacha (6) ══════
		{
			Name: "月痴兽", Description: "月光下跳舞的可爱生物，两只大眼睛",
			Rarity: "N", Element: "loyalty", VisualKey: "mooncalf", IsStarter: false, Enabled: true,
			BaseStats:       mustMarshal(map[string]int{"attack": 8, "defense": 12, "speed": 8, "luck": 12}),
			EvolutionStages: mustMarshal([]map[string]any{{"stage": 0, "name": "月光蛋"}, {"stage": 1, "name": "小月兽"}, {"stage": 2, "name": "月舞者"}}),
			CreatedAt: now, UpdatedAt: now,
		},
		{
			Name: "仙子精灵", Description: "像花生豆大小的精灵，会发光",
			Rarity: "N", Element: "wisdom", VisualKey: "fairy", IsStarter: false, Enabled: true,
			BaseStats:       mustMarshal(map[string]int{"attack": 6, "defense": 8, "speed": 12, "luck": 14}),
			EvolutionStages: mustMarshal([]map[string]any{{"stage": 0, "name": "光之蛋"}, {"stage": 1, "name": "小精灵"}, {"stage": 2, "name": "辉光仙子"}}),
			CreatedAt: now, UpdatedAt: now,
		},
		{
			Name: "火螳蟆", Description: "背甲镶满宝石的大螃蟹，能喷火",
			Rarity: "N", Element: "courage", VisualKey: "firecrab", IsStarter: false, Enabled: true,
			BaseStats:       mustMarshal(map[string]int{"attack": 14, "defense": 12, "speed": 6, "luck": 8}),
			EvolutionStages: mustMarshal([]map[string]any{{"stage": 0, "name": "宝石蛋"}, {"stage": 1, "name": "小火蟹"}, {"stage": 2, "name": "烈焰宝蟹"}}),
			CreatedAt: now, UpdatedAt: now,
		},
		{
			Name: "渡渡鸟", Description: "能瞬间消失的圆胖鸟，麻瓜以为已灭绝",
			Rarity: "N", Element: "wisdom", VisualKey: "diricawl", IsStarter: false, Enabled: true,
			BaseStats:       mustMarshal(map[string]int{"attack": 6, "defense": 10, "speed": 12, "luck": 12}),
			EvolutionStages: mustMarshal([]map[string]any{{"stage": 0, "name": "消失蛋"}, {"stage": 1, "name": "小胖鸟"}, {"stage": 2, "name": "幻影渡渡"}}),
			CreatedAt: now, UpdatedAt: now,
		},
		{
			Name: "爆尾螾蝈", Description: "会自爆的小怪兽，尾部能喷火",
			Rarity: "N", Element: "courage", VisualKey: "skrewt", IsStarter: false, Enabled: true,
			BaseStats:       mustMarshal(map[string]int{"attack": 14, "defense": 10, "speed": 10, "luck": 6}),
			EvolutionStages: mustMarshal([]map[string]any{{"stage": 0, "name": "火尾蛋"}, {"stage": 1, "name": "小爆尾"}, {"stage": 2, "name": "狱火螾蝈"}}),
			CreatedAt: now, UpdatedAt: now,
		},
		{
			Name: "三头蛇", Description: "三头蛇，每个头有不同性格",
			Rarity: "N", Element: "ambition", VisualKey: "runespoor", IsStarter: false, Enabled: true,
			BaseStats:       mustMarshal(map[string]int{"attack": 10, "defense": 8, "speed": 14, "luck": 8}),
			EvolutionStages: mustMarshal([]map[string]any{{"stage": 0, "name": "蛇纹蛋"}, {"stage": 1, "name": "小蛇头"}, {"stage": 2, "name": "三面蛇王"}}),
			CreatedAt: now, UpdatedAt: now,
		},
		// ══════ R (10) ══════
		{
			Name: "鸟蛇", Description: "能伸缩的银色飞蛇，蛋是纯银",
			Rarity: "R", Element: "wisdom", VisualKey: "occamy", IsStarter: false, Enabled: true,
			BaseStats:       mustMarshal(map[string]int{"attack": 12, "defense": 12, "speed": 14, "luck": 18}),
			EvolutionStages: mustMarshal([]map[string]any{{"stage": 0, "name": "银壳蛋"}, {"stage": 1, "name": "小鸟蛇"}, {"stage": 2, "name": "银翼鸟蛇"}}),
			CreatedAt: now, UpdatedAt: now,
		},
		{
			Name: "雷鸟", Description: "能控制天气的巨鸟，来自亚利桑那",
			Rarity: "R", Element: "courage", VisualKey: "thunderbird", IsStarter: false, Enabled: true,
			BaseStats:       mustMarshal(map[string]int{"attack": 18, "defense": 14, "speed": 14, "luck": 10}),
			EvolutionStages: mustMarshal([]map[string]any{{"stage": 0, "name": "雷云蛋"}, {"stage": 1, "name": "小雷鸟"}, {"stage": 2, "name": "风暴雷鸟"}}),
			CreatedAt: now, UpdatedAt: now,
		},
		{
			Name: "鹰马", Description: "有马头、鹰身、鹰翅，骄傲但忠诚",
			Rarity: "R", Element: "courage", VisualKey: "hippogriff", IsStarter: false, Enabled: true,
			BaseStats:       mustMarshal(map[string]int{"attack": 16, "defense": 14, "speed": 16, "luck": 10}),
			EvolutionStages: mustMarshal([]map[string]any{{"stage": 0, "name": "鹰羽蛋"}, {"stage": 1, "name": "小鹰马"}, {"stage": 2, "name": "天际鹰马"}}),
			CreatedAt: now, UpdatedAt: now,
		},
		{
			Name: "狸猫", Description: "跟大猫一样但更智慧，能识别坏人",
			Rarity: "R", Element: "wisdom", VisualKey: "kneazle", IsStarter: false, Enabled: true,
			BaseStats:       mustMarshal(map[string]int{"attack": 10, "defense": 14, "speed": 14, "luck": 18}),
			EvolutionStages: mustMarshal([]map[string]any{{"stage": 0, "name": "猫纹蛋"}, {"stage": 1, "name": "小狸猫"}, {"stage": 2, "name": "洞察狸猫"}}),
			CreatedAt: now, UpdatedAt: now,
		},
		{
			Name: "邪恶鸟", Description: "蓝绿色蝴蝶形态，能吸取忧伤记忆",
			Rarity: "R", Element: "ambition", VisualKey: "swoopingevil", IsStarter: false, Enabled: true,
			BaseStats:       mustMarshal(map[string]int{"attack": 14, "defense": 10, "speed": 18, "luck": 14}),
			EvolutionStages: mustMarshal([]map[string]any{{"stage": 0, "name": "茧壳蛋"}, {"stage": 1, "name": "小邪翼"}, {"stage": 2, "name": "深渊蝶翼"}}),
			CreatedAt: now, UpdatedAt: now,
		},
		{
			Name: "驺吾", Description: "强大的马形生物，能日行千里",
			Rarity: "R", Element: "courage", VisualKey: "zouwu", IsStarter: false, Enabled: true,
			BaseStats:       mustMarshal(map[string]int{"attack": 16, "defense": 12, "speed": 18, "luck": 10}),
			EvolutionStages: mustMarshal([]map[string]any{{"stage": 0, "name": "瑞兽蛋"}, {"stage": 1, "name": "小驺吾"}, {"stage": 2, "name": "千里驺吾"}}),
			CreatedAt: now, UpdatedAt: now,
		},
		{
			Name: "水精", Description: "小型水生魔法生物，绿色皮肤，抓力惊人",
			Rarity: "R", Element: "ambition", VisualKey: "grindylow", IsStarter: false, Enabled: true,
			BaseStats:       mustMarshal(map[string]int{"attack": 14, "defense": 12, "speed": 16, "luck": 14}),
			EvolutionStages: mustMarshal([]map[string]any{{"stage": 0, "name": "水泡蛋"}, {"stage": 1, "name": "小水精"}, {"stage": 2, "name": "深渊水魔"}}),
			CreatedAt: now, UpdatedAt: now,
		},
		{
			Name: "博格特", Description: "能变形成你最怕的东西，真身无人知晓",
			Rarity: "R", Element: "ambition", VisualKey: "boggart", IsStarter: false, Enabled: true,
			BaseStats:       mustMarshal(map[string]int{"attack": 14, "defense": 10, "speed": 16, "luck": 16}),
			EvolutionStages: mustMarshal([]map[string]any{{"stage": 0, "name": "暗影蛋"}, {"stage": 1, "name": "小博格"}, {"stage": 2, "name": "恐惧化身"}}),
			CreatedAt: now, UpdatedAt: now,
		},
		{
			Name: "安哥拉猫", Description: "长毛魔法猫，通体雪白，能感知危险",
			Rarity: "R", Element: "loyalty", VisualKey: "angorakneazle", IsStarter: false, Enabled: true,
			BaseStats:       mustMarshal(map[string]int{"attack": 10, "defense": 18, "speed": 12, "luck": 16}),
			EvolutionStages: mustMarshal([]map[string]any{{"stage": 0, "name": "白绒蛋"}, {"stage": 1, "name": "小白猫"}, {"stage": 2, "name": "雪灵猫"}}),
			CreatedAt: now, UpdatedAt: now,
		},
		{
			Name: "狐媚子", Description: "羽毛鲜艳的魔法鸟，歌声能令人疯狂",
			Rarity: "R", Element: "wisdom", VisualKey: "fwooper", IsStarter: false, Enabled: true,
			BaseStats:       mustMarshal(map[string]int{"attack": 10, "defense": 12, "speed": 16, "luck": 18}),
			EvolutionStages: mustMarshal([]map[string]any{{"stage": 0, "name": "彩羽蛋"}, {"stage": 1, "name": "小狐鸟"}, {"stage": 2, "name": "幻音狐鸟"}}),
			CreatedAt: now, UpdatedAt: now,
		},
		// ══════ SR (8) ══════
		{
			Name: "独角兽", Description: "纯洁之兽，银色鬃毛，血液能续命",
			Rarity: "SR", Element: "loyalty", VisualKey: "unicorn", IsStarter: false, Enabled: true,
			BaseStats:       mustMarshal(map[string]int{"attack": 14, "defense": 22, "speed": 16, "luck": 20}),
			EvolutionStages: mustMarshal([]map[string]any{{"stage": 0, "name": "银光蛋"}, {"stage": 1, "name": "独角幼驹"}, {"stage": 2, "name": "圣银独角兽"}}),
			CreatedAt: now, UpdatedAt: now,
		},
		{
			Name: "毒豹", Description: "最危险的魔法生物之一，吐息有剧毒",
			Rarity: "SR", Element: "ambition", VisualKey: "nundu", IsStarter: false, Enabled: true,
			BaseStats:       mustMarshal(map[string]int{"attack": 20, "defense": 14, "speed": 22, "luck": 16}),
			EvolutionStages: mustMarshal([]map[string]any{{"stage": 0, "name": "毒雾蛋"}, {"stage": 1, "name": "幼毒豹"}, {"stage": 2, "name": "瘟疫毒豹"}}),
			CreatedAt: now, UpdatedAt: now,
		},
		{
			Name: "石墨兽", Description: "外皮坚硬如岩石，有两只金色长角",
			Rarity: "SR", Element: "courage", VisualKey: "graphorn", IsStarter: false, Enabled: true,
			BaseStats:       mustMarshal(map[string]int{"attack": 22, "defense": 20, "speed": 14, "luck": 16}),
			EvolutionStages: mustMarshal([]map[string]any{{"stage": 0, "name": "岩石蛋"}, {"stage": 1, "name": "小石兽"}, {"stage": 2, "name": "磐岩石墨兽"}}),
			CreatedAt: now, UpdatedAt: now,
		},
		{
			Name: "天马", Description: "巨大的金色飞马，力大无穷",
			Rarity: "SR", Element: "courage", VisualKey: "abraxan", IsStarter: false, Enabled: true,
			BaseStats:       mustMarshal(map[string]int{"attack": 20, "defense": 18, "speed": 18, "luck": 16}),
			EvolutionStages: mustMarshal([]map[string]any{{"stage": 0, "name": "金翼蛋"}, {"stage": 1, "name": "小天马"}, {"stage": 2, "name": "圣光天马"}}),
			CreatedAt: now, UpdatedAt: now,
		},
		{
			Name: "红帽子", Description: "矮小凶残的生物，帽子浸满鲜血",
			Rarity: "SR", Element: "ambition", VisualKey: "redcap", IsStarter: false, Enabled: true,
			BaseStats:       mustMarshal(map[string]int{"attack": 20, "defense": 14, "speed": 20, "luck": 18}),
			EvolutionStages: mustMarshal([]map[string]any{{"stage": 0, "name": "血色蛋"}, {"stage": 1, "name": "小红帽"}, {"stage": 2, "name": "血冠暴徒"}}),
			CreatedAt: now, UpdatedAt: now,
		},
		{
			Name: "人马", Description: "半人半马，精通占星术和箭术",
			Rarity: "SR", Element: "wisdom", VisualKey: "centaur", IsStarter: false, Enabled: true,
			BaseStats:       mustMarshal(map[string]int{"attack": 16, "defense": 16, "speed": 18, "luck": 22}),
			EvolutionStages: mustMarshal([]map[string]any{{"stage": 0, "name": "星辰蛋"}, {"stage": 1, "name": "人马幼驹"}, {"stage": 2, "name": "星象贤者"}}),
			CreatedAt: now, UpdatedAt: now,
		},
		{
			Name: "鱍尾豺", Description: "像大号雪貂，会说人话（多为脏话）",
			Rarity: "SR", Element: "ambition", VisualKey: "jarvey", IsStarter: false, Enabled: true,
			BaseStats:       mustMarshal(map[string]int{"attack": 18, "defense": 14, "speed": 22, "luck": 18}),
			EvolutionStages: mustMarshal([]map[string]any{{"stage": 0, "name": "毛皮蛋"}, {"stage": 1, "name": "小鱍豺"}, {"stage": 2, "name": "毒舌鱍豺"}}),
			CreatedAt: now, UpdatedAt: now,
		},
		{
			Name: "不死鸟", Description: "外形凄凉的鸟，能预测暴风雨",
			Rarity: "SR", Element: "wisdom", VisualKey: "augurey", IsStarter: false, Enabled: true,
			BaseStats:       mustMarshal(map[string]int{"attack": 14, "defense": 18, "speed": 18, "luck": 22}),
			EvolutionStages: mustMarshal([]map[string]any{{"stage": 0, "name": "雨云蛋"}, {"stage": 1, "name": "小哀鸟"}, {"stage": 2, "name": "暴风先知"}}),
			CreatedAt: now, UpdatedAt: now,
		},
		// ══════ SSR (5) ══════
		{
			Name: "凤凰", Description: "凤凰涅槃，活了几百年，泪水有治愈之力",
			Rarity: "SSR", Element: "courage", VisualKey: "phoenix", IsStarter: false, Enabled: true,
			BaseStats:       mustMarshal(map[string]int{"attack": 28, "defense": 22, "speed": 26, "luck": 24}),
			EvolutionStages: mustMarshal([]map[string]any{{"stage": 0, "name": "涅槃蛋"}, {"stage": 1, "name": "幼凤凰"}, {"stage": 2, "name": "不朽凤凰"}}),
			CreatedAt: now, UpdatedAt: now,
		},
		{
			Name: "蛇怪", Description: "蛇之王，目光致命，只有蛇佬腔能控制",
			Rarity: "SSR", Element: "ambition", VisualKey: "basilisk", IsStarter: false, Enabled: true,
			BaseStats:       mustMarshal(map[string]int{"attack": 30, "defense": 20, "speed": 26, "luck": 24}),
			EvolutionStages: mustMarshal([]map[string]any{{"stage": 0, "name": "蛇王蛋"}, {"stage": 1, "name": "幼蛇怪"}, {"stage": 2, "name": "千年蛇怪"}}),
			CreatedAt: now, UpdatedAt: now,
		},
		{
			Name: "麒麟", Description: "纯洁之兽，能洞察善恶，决定魔法部领导人",
			Rarity: "SSR", Element: "wisdom", VisualKey: "qilin", IsStarter: false, Enabled: true,
			BaseStats:       mustMarshal(map[string]int{"attack": 20, "defense": 24, "speed": 24, "luck": 32}),
			EvolutionStages: mustMarshal([]map[string]any{{"stage": 0, "name": "祥瑞蛋"}, {"stage": 1, "name": "幼麒麟"}, {"stage": 2, "name": "天命麒麟"}}),
			CreatedAt: now, UpdatedAt: now,
		},
		{
			Name: "匈牙利树锋", Description: "最危险的火龙，三强争霸赛之一",
			Rarity: "SSR", Element: "courage", VisualKey: "horntail", IsStarter: false, Enabled: true,
			BaseStats:       mustMarshal(map[string]int{"attack": 32, "defense": 26, "speed": 22, "luck": 20}),
			EvolutionStages: mustMarshal([]map[string]any{{"stage": 0, "name": "龙焰蛋"}, {"stage": 1, "name": "幼树锋"}, {"stage": 2, "name": "匈牙利树锋龙王"}}),
			CreatedAt: now, UpdatedAt: now,
		},
		{
			Name: "夜骐", Description: "纯黑色飞马，只有见过死亡的人才能看到",
			Rarity: "SSR", Element: "ambition", VisualKey: "thestral", IsStarter: false, Enabled: true,
			BaseStats:       mustMarshal(map[string]int{"attack": 24, "defense": 22, "speed": 30, "luck": 24}),
			EvolutionStages: mustMarshal([]map[string]any{{"stage": 0, "name": "暗影蛋"}, {"stage": 1, "name": "幼夜骐"}, {"stage": 2, "name": "死亡之翼"}}),
			CreatedAt: now, UpdatedAt: now,
		},
	}

	for i := range species {
		if err := DB.Create(&species[i]).Error; err != nil {
			common.SysError("failed to seed pet species: " + err.Error())
			return
		}
	}

	// Seed items (only when pet_items is empty)
	var itemCount int64
	DB.Model(&PetItem{}).Count(&itemCount)
	if itemCount > 0 {
		return
	}

	items := []PetItem{
		// ========== Food (restores hunger) ==========
		{
			Name:        "南瓜汁",
			Description: "霍格沃茨餐桌上的经典饮品，清甜可口，恢复少量饥饿值",
			Type:        "food",
			Rarity:      "N",
			Price:       30000,
			Enabled:     true,
			Effect:      mustMarshal(map[string]int{"hunger": 20}),
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			Name:        "比比多味豆",
			Description: "每一颗都是惊喜——可能是草莓味，也可能是耳屎味",
			Type:        "food",
			Rarity:      "N",
			Price:       60000,
			Enabled:     true,
			Effect:      mustMarshal(map[string]int{"hunger": 30}),
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			Name:        "巧克力蛙",
			Description: "附赠一张巫师卡片！浓郁的巧克力让宠物精神焕发",
			Type:        "food",
			Rarity:      "R",
			Price:       100000,
			Enabled:     true,
			Effect:      mustMarshal(map[string]int{"hunger": 40, "mood": 10}),
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			Name:        "太妃糖布丁",
			Description: "哈利·波特的最爱！霍格沃茨大厅招牌甜点，恢复大量饥饿值",
			Type:        "food",
			Rarity:      "SR",
			Price:       180000,
			Enabled:     true,
			Effect:      mustMarshal(map[string]int{"hunger": 60, "mood": 10}),
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			Name:        "黄油啤酒",
			Description: "三把扫帚酒吧的招牌饮品，温暖的奶油泡沫让宠物心满意足",
			Type:        "food",
			Rarity:      "R",
			Price:       120000,
			Enabled:     true,
			Effect:      mustMarshal(map[string]int{"hunger": 30, "mood": 25}),
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		// ========== Potions (restores mood, cleanliness, or special) ==========
		{
			Name:        "缩身药水",
			Description: "斯内普教授二年级课程的经典药剂，便宜实用，提振精神",
			Type:        "potion",
			Rarity:      "N",
			Price:       50000,
			Enabled:     true,
			Effect:      mustMarshal(map[string]int{"mood": 25}),
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			Name:        "提神药剂",
			Description: "庞弗雷夫人的常备药品，一剂下去耳朵冒烟，精神百倍",
			Type:        "potion",
			Rarity:      "R",
			Price:       100000,
			Enabled:     true,
			Effect:      mustMarshal(map[string]int{"mood": 45}),
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			Name:        "清洁魔药",
			Description: "强力清洁配方，一瓶搞定所有污渍，让宠物光洁如新",
			Type:        "potion",
			Rarity:      "N",
			Price:       75000,
			Enabled:     true,
			Effect:      mustMarshal(map[string]int{"cleanliness": 45}),
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			Name:        "生骨药",
			Description: "味道糟糕但效果拔群，能全方位恢复宠物的状态",
			Type:        "potion",
			Rarity:      "SR",
			Price:       200000,
			Enabled:     true,
			Effect:      mustMarshal(map[string]int{"hunger": 20, "mood": 20, "cleanliness": 20}),
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			Name:        "福灵剂",
			Description: "传说中的液体幸运——金色琼浆大幅提升宠物所有状态",
			Type:        "potion",
			Rarity:      "SSR",
			Price:       500000,
			Enabled:     true,
			Effect:      mustMarshal(map[string]int{"hunger": 40, "mood": 40, "cleanliness": 40}),
			CreatedAt:   now,
			UpdatedAt:   now,
		},
	}

	for i := range items {
		if err := DB.Create(&items[i]).Error; err != nil {
			common.SysError("failed to seed pet item: " + err.Error())
			return
		}
	}

	common.SysLog("pet species and items seeded successfully")
}
