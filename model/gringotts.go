package model

import (
	"time"

	"gorm.io/gorm"
)

// GringottsHeistRecord 古灵阁打劫记录
type GringottsHeistRecord struct {
	Id          int    `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId      int    `json:"user_id" gorm:"not null;index:idx_heist_user"`
	HeistType   string `json:"heist_type" gorm:"type:varchar(20);not null"` // sneak, dragon, imperio
	EntranceFee int    `json:"entrance_fee" gorm:"default:0"`
	Success     bool   `json:"success" gorm:"default:false"`
	Reward      int    `json:"reward" gorm:"default:0"`
	Penalty     int    `json:"penalty" gorm:"default:0"`
	VaultBefore int64  `json:"vault_before" gorm:"default:0"`
	Details     string `json:"details" gorm:"type:text"` // JSON narrative
	CreatedAt   int64  `json:"created_at" gorm:"bigint;index:idx_heist_created"`
}

func (GringottsHeistRecord) TableName() string {
	return "gringotts_heist_records"
}

// ==================== CRUD ====================

func CreateHeistRecord(record *GringottsHeistRecord) error {
	record.CreatedAt = time.Now().Unix()
	return DB.Create(record).Error
}

func GetHeistHistory(userId int, page, perPage int) ([]GringottsHeistRecord, int64, error) {
	var records []GringottsHeistRecord
	var total int64

	q := DB.Model(&GringottsHeistRecord{}).Where("user_id = ?", userId)
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	if offset < 0 {
		offset = 0
	}
	err := q.Order("created_at desc").Offset(offset).Limit(perPage).Find(&records).Error
	return records, total, err
}

func GetLastHeistByType(userId int, heistType string) (*GringottsHeistRecord, error) {
	var record GringottsHeistRecord
	err := DB.Where("user_id = ? AND heist_type = ?", userId, heistType).
		Order("created_at desc").First(&record).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &record, nil
}

func GetRecentSuccessfulHeist(withinSeconds int64) (*GringottsHeistRecord, error) {
	var record GringottsHeistRecord
	cutoff := time.Now().Unix() - withinSeconds
	err := DB.Where("success = ? AND created_at > ?", true, cutoff).
		Order("created_at desc").First(&record).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &record, nil
}

// GetHeistTotalStolen 获取所有打劫成功的总奖励
func GetHeistTotalStolen() int64 {
	var result struct {
		Total int64 `gorm:"column:total"`
	}
	DB.Model(&GringottsHeistRecord{}).
		Where("success = ?", true).
		Select("COALESCE(SUM(reward), 0) as total").
		Scan(&result)
	return result.Total
}

// GetGringottsVaultBalance 金库余额 = 赌场总亏损 - 赌场总赢利 - 被打劫总额 + 管理员注入总额
func GetGringottsVaultBalance() int64 {
	var casinoResult struct {
		TotalLost int64 `gorm:"column:total_lost"`
		TotalWon  int64 `gorm:"column:total_won"`
	}
	DB.Model(&CasinoDailyStats{}).
		Select("COALESCE(SUM(total_lost), 0) as total_lost, COALESCE(SUM(total_won), 0) as total_won").
		Scan(&casinoResult)

	stolen := GetHeistTotalStolen()
	injected := GetVaultTotalInjected()
	balance := casinoResult.TotalLost - casinoResult.TotalWon - stolen + injected
	if balance < 0 {
		balance = 0
	}
	return balance
}

// GetUserHeistSuccessCount 获取用户打劫成功次数
func GetUserHeistSuccessCount(userId int) int64 {
	var count int64
	DB.Model(&GringottsHeistRecord{}).
		Where("user_id = ? AND success = ?", userId, true).
		Count(&count)
	return count
}

// GetUserImperioSuccessCount 获取用户 imperio 打劫成功次数
func GetUserImperioSuccessCount(userId int) int64 {
	var count int64
	DB.Model(&GringottsHeistRecord{}).
		Where("user_id = ? AND success = ? AND heist_type = ?", userId, true, "imperio").
		Count(&count)
	return count
}

// ==================== Vault Injection ====================

// GringottsVaultInjection 管理员金库注入/提取记录
type GringottsVaultInjection struct {
	Id        int    `json:"id" gorm:"primaryKey;autoIncrement"`
	AdminId   int    `json:"admin_id" gorm:"not null;index:idx_vault_inject_admin"`
	Amount    int64  `json:"amount" gorm:"not null"` // 正=注入, 负=提取
	Remark    string `json:"remark" gorm:"type:varchar(200)"`
	CreatedAt int64  `json:"created_at" gorm:"bigint;index:idx_vault_inject_created"`
}

func (GringottsVaultInjection) TableName() string {
	return "gringotts_vault_injections"
}

func CreateVaultInjection(record *GringottsVaultInjection) error {
	record.CreatedAt = time.Now().Unix()
	return DB.Create(record).Error
}

// GetVaultTotalInjected 获取管理员注入净额（注入-提取）
func GetVaultTotalInjected() int64 {
	var result struct {
		Total int64 `gorm:"column:total"`
	}
	DB.Model(&GringottsVaultInjection{}).
		Select("COALESCE(SUM(amount), 0) as total").
		Scan(&result)
	return result.Total
}

// GetVaultInjectionHistory 获取注入历史
func GetVaultInjectionHistory(page, perPage int) ([]GringottsVaultInjection, int64, error) {
	var records []GringottsVaultInjection
	var total int64

	q := DB.Model(&GringottsVaultInjection{})
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	if offset < 0 {
		offset = 0
	}
	err := q.Order("created_at desc").Offset(offset).Limit(perPage).Find(&records).Error
	return records, total, err
}
