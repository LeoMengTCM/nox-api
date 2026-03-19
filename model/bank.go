package model

import (
	"time"

	"gorm.io/gorm"
)

// ==================== Bank Account (活期账户) ====================

const (
	AccountTypeDemand  = 0 // 普通活期
	AccountTypePremium = 1 // 高息活期
)

type BankAccount struct {
	Id                  int   `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId              int   `json:"user_id" gorm:"uniqueIndex:idx_bank_user_type"`
	AccountType         int   `json:"account_type" gorm:"uniqueIndex:idx_bank_user_type;default:0"` // 0=普通活期 1=高息活期
	Balance             int   `json:"balance" gorm:"default:0"`
	TotalInterestEarned int   `json:"total_interest_earned" gorm:"default:0"`
	LastInterestAt      int64 `json:"last_interest_at" gorm:"bigint;default:0"`
	CreatedAt           int64 `json:"created_at" gorm:"bigint"`
}

func (BankAccount) TableName() string {
	return "gringotts_bank_accounts"
}

func GetOrCreateBankAccount(userId int, accountType int) (*BankAccount, error) {
	var account BankAccount
	err := DB.Where("user_id = ? AND account_type = ?", userId, accountType).First(&account).Error
	if err == gorm.ErrRecordNotFound {
		account = BankAccount{
			UserId:      userId,
			AccountType: accountType,
			CreatedAt:   time.Now().Unix(),
		}
		if err := DB.Create(&account).Error; err != nil {
			return nil, err
		}
		return &account, nil
	}
	return &account, err
}

func GetBankAccount(userId int, accountType int) (*BankAccount, error) {
	var account BankAccount
	err := DB.Where("user_id = ? AND account_type = ?", userId, accountType).First(&account).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &account, err
}

// GetAllActiveBankAccounts returns all accounts with balance > 0 for interest calculation
func GetAllActiveBankAccounts() ([]BankAccount, error) {
	var accounts []BankAccount
	err := DB.Where("balance > 0").Find(&accounts).Error
	return accounts, err
}

func UpdateBankAccountBalance(id int, balance int, interestEarned int, lastInterestAt int64) error {
	updates := map[string]interface{}{
		"balance":               balance,
		"total_interest_earned": interestEarned,
	}
	if lastInterestAt > 0 {
		updates["last_interest_at"] = lastInterestAt
	}
	return DB.Model(&BankAccount{}).Where("id = ?", id).Updates(updates).Error
}

// AtomicDepositBank atomically increases bank balance, returns new balance
func AtomicDepositBank(userId int, accountType int, amount int) (int, error) {
	result := DB.Model(&BankAccount{}).Where("user_id = ? AND account_type = ?", userId, accountType).
		Update("balance", gorm.Expr("balance + ?", amount))
	if result.Error != nil {
		return 0, result.Error
	}
	var account BankAccount
	DB.Where("user_id = ? AND account_type = ?", userId, accountType).First(&account)
	return account.Balance, nil
}

// AtomicWithdrawBank atomically decreases bank balance only if sufficient. Returns (success, newBalance, error).
func AtomicWithdrawBank(userId int, accountType int, amount int) (bool, int, error) {
	result := DB.Model(&BankAccount{}).
		Where("user_id = ? AND account_type = ? AND balance >= ?", userId, accountType, amount).
		Update("balance", gorm.Expr("balance - ?", amount))
	if result.Error != nil {
		return false, 0, result.Error
	}
	if result.RowsAffected == 0 {
		return false, 0, nil
	}
	var account BankAccount
	DB.Where("user_id = ? AND account_type = ?", userId, accountType).First(&account)
	return true, account.Balance, nil
}

// GetBankTotalDeposits returns total demand balance across all users for a given account type
func GetBankTotalDeposits(accountType int) int64 {
	var result struct {
		Total int64 `gorm:"column:total"`
	}
	DB.Model(&BankAccount{}).Where("account_type = ?", accountType).Select("COALESCE(SUM(balance), 0) as total").Scan(&result)
	return result.Total
}

// GetBankTotalInterestPaid returns total interest earned across all users for a given account type
func GetBankTotalInterestPaid(accountType int) int64 {
	var result struct {
		Total int64 `gorm:"column:total"`
	}
	DB.Model(&BankAccount{}).Where("account_type = ?", accountType).Select("COALESCE(SUM(total_interest_earned), 0) as total").Scan(&result)
	return result.Total
}

// GetBankAccountCount returns total number of accounts with balance > 0
func GetBankAccountCount() int64 {
	var count int64
	DB.Model(&BankAccount{}).Where("balance > 0").Count(&count)
	return count
}

// ==================== Fixed Deposit (定期存单) ====================

const (
	FixedStatusActive    = 0 // 生效中
	FixedStatusMatured   = 1 // 已到期
	FixedStatusWithdrawn = 2 // 已取出
	FixedStatusEarly     = 3 // 提前取出
)

type FixedDeposit struct {
	Id             int   `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId         int   `json:"user_id" gorm:"index:idx_fixed_user"`
	Amount         int   `json:"amount" gorm:"default:0"`
	AnnualRate     int   `json:"annual_rate" gorm:"default:0"`      // 万分比
	TermDays       int   `json:"term_days" gorm:"default:0"`        // 7/30/90
	InterestEarned int   `json:"interest_earned" gorm:"default:0"`  // 已计利息
	DepositAt      int64 `json:"deposit_at" gorm:"bigint"`          // 存入时间
	MatureAt       int64 `json:"mature_at" gorm:"bigint;index:idx_fixed_mature"` // 到期时间
	Status         int   `json:"status" gorm:"default:0"`           // 0=active, 1=matured, 2=withdrawn, 3=early
	CreatedAt      int64 `json:"created_at" gorm:"bigint"`
}

func (FixedDeposit) TableName() string {
	return "gringotts_fixed_deposits"
}

func CreateFixedDeposit(deposit *FixedDeposit) error {
	deposit.CreatedAt = time.Now().Unix()
	return DB.Create(deposit).Error
}

func GetUserFixedDeposits(userId int) ([]FixedDeposit, error) {
	var deposits []FixedDeposit
	err := DB.Where("user_id = ? AND status IN (?, ?)", userId, FixedStatusActive, FixedStatusMatured).
		Order("created_at desc").Find(&deposits).Error
	return deposits, err
}

func GetUserActiveFixedCount(userId int) (int64, error) {
	var count int64
	err := DB.Model(&FixedDeposit{}).Where("user_id = ? AND status = ?", userId, FixedStatusActive).Count(&count).Error
	return count, err
}

func GetFixedDepositById(id int, userId int) (*FixedDeposit, error) {
	var deposit FixedDeposit
	err := DB.Where("id = ? AND user_id = ?", id, userId).First(&deposit).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &deposit, err
}

func UpdateFixedDepositStatus(id int, status int, interestEarned int) error {
	return DB.Model(&FixedDeposit{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":          status,
		"interest_earned": interestEarned,
	}).Error
}

// GetMaturedFixedDeposits returns deposits that have matured but not yet processed
func GetMaturedFixedDeposits() ([]FixedDeposit, error) {
	var deposits []FixedDeposit
	now := time.Now().Unix()
	err := DB.Where("status = ? AND mature_at <= ?", FixedStatusActive, now).Find(&deposits).Error
	return deposits, err
}

// GetFixedTotalDeposits returns total fixed deposit amount (active only)
func GetFixedTotalDeposits() int64 {
	var result struct {
		Total int64 `gorm:"column:total"`
	}
	DB.Model(&FixedDeposit{}).Where("status = ?", FixedStatusActive).
		Select("COALESCE(SUM(amount), 0) as total").Scan(&result)
	return result.Total
}

// GetFixedTotalInterestPaid returns total interest paid for fixed deposits
func GetFixedTotalInterestPaid() int64 {
	var result struct {
		Total int64 `gorm:"column:total"`
	}
	DB.Model(&FixedDeposit{}).Where("status IN (?, ?, ?)", FixedStatusMatured, FixedStatusWithdrawn, FixedStatusEarly).
		Select("COALESCE(SUM(interest_earned), 0) as total").Scan(&result)
	return result.Total
}

// ==================== Bank Transaction (交易流水) ====================

type BankTransaction struct {
	Id           int    `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId       int    `json:"user_id" gorm:"index:idx_bank_tx_user"`
	TxType       string `json:"tx_type" gorm:"type:varchar(30);not null"`
	Amount       int    `json:"amount" gorm:"default:0"`
	BalanceAfter int    `json:"balance_after" gorm:"default:0"`
	Description  string `json:"description" gorm:"type:varchar(200)"`
	RelatedId    int    `json:"related_id" gorm:"default:0"`
	CreatedAt    int64  `json:"created_at" gorm:"bigint;index:idx_bank_tx_created"`
}

func (BankTransaction) TableName() string {
	return "gringotts_bank_transactions"
}

func CreateBankTransaction(tx *BankTransaction) error {
	tx.CreatedAt = time.Now().Unix()
	return DB.Create(tx).Error
}

func GetBankTransactions(userId int, page, perPage int) ([]BankTransaction, int64, error) {
	var txs []BankTransaction
	var total int64

	q := DB.Model(&BankTransaction{}).Where("user_id = ?", userId)
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	if offset < 0 {
		offset = 0
	}
	err := q.Order("created_at desc").Offset(offset).Limit(perPage).Find(&txs).Error
	return txs, total, err
}
