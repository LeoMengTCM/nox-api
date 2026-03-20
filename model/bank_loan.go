package model

import (
	"time"

	"gorm.io/gorm"
)

// ==================== Loan (信用贷款) ====================

const (
	LoanStatusActive  = 0 // 还款中
	LoanStatusRepaid  = 1 // 已还清
	LoanStatusOverdue = 2 // 已逾期
)

type GringottsLoan struct {
	Id              int   `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId          int   `json:"user_id" gorm:"index:idx_loan_user"`
	Amount          int   `json:"amount" gorm:"default:0"`           // 贷款本金 (quota)
	InterestAccrued int   `json:"interest_accrued" gorm:"default:0"` // 已累计利息 (quota)
	InterestPaid    int   `json:"interest_paid" gorm:"default:0"`    // 已偿还利息 (quota)
	PrincipalPaid   int   `json:"principal_paid" gorm:"default:0"`   // 已偿还本金 (quota)
	AnnualRate      int   `json:"annual_rate" gorm:"default:0"`      // 年化利率 万分比
	TermDays        int   `json:"term_days" gorm:"default:0"`        // 贷款期限天数
	Status          int   `json:"status" gorm:"default:0"`           // 0=active, 1=repaid, 2=overdue
	DueAt           int64 `json:"due_at" gorm:"bigint;index:idx_loan_due"`
	CreatedAt       int64 `json:"created_at" gorm:"bigint"`
	RepaidAt        int64 `json:"repaid_at" gorm:"bigint;default:0"`
}

func (GringottsLoan) TableName() string {
	return "gringotts_loans"
}

func CreateLoan(loan *GringottsLoan) error {
	loan.CreatedAt = time.Now().Unix()
	return DB.Create(loan).Error
}

func GetUserActiveLoans(userId int) ([]GringottsLoan, error) {
	var loans []GringottsLoan
	err := DB.Where("user_id = ? AND status IN (?, ?)", userId, LoanStatusActive, LoanStatusOverdue).
		Order("created_at desc").Find(&loans).Error
	return loans, err
}

func GetUserActiveLoanCount(userId int) (int64, error) {
	var count int64
	err := DB.Model(&GringottsLoan{}).
		Where("user_id = ? AND status IN (?, ?)", userId, LoanStatusActive, LoanStatusOverdue).
		Count(&count).Error
	return count, err
}

func GetLoanById(id int, userId int) (*GringottsLoan, error) {
	var loan GringottsLoan
	err := DB.Where("id = ? AND user_id = ?", id, userId).First(&loan).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &loan, err
}

// GetAllActiveLoans returns all loans with status active or overdue (for interest calculation)
func GetAllActiveLoans() ([]GringottsLoan, error) {
	var loans []GringottsLoan
	err := DB.Where("status IN (?, ?)", LoanStatusActive, LoanStatusOverdue).Find(&loans).Error
	return loans, err
}

// UpdateLoanInterest updates interest_accrued for a single loan
func UpdateLoanInterest(id int, interestAccrued int) error {
	return DB.Model(&GringottsLoan{}).Where("id = ?", id).
		Update("interest_accrued", interestAccrued).Error
}

// UpdateLoanOverdue marks a loan as overdue
func UpdateLoanOverdue(id int) error {
	return DB.Model(&GringottsLoan{}).Where("id = ?", id).
		Update("status", LoanStatusOverdue).Error
}

// UpdateLoanRepayment updates repayment fields for a loan
func UpdateLoanRepayment(id int, interestPaid, principalPaid, interestAccrued, status int) error {
	updates := map[string]interface{}{
		"interest_paid":    interestPaid,
		"principal_paid":   principalPaid,
		"interest_accrued": interestAccrued,
		"status":           status,
	}
	if status == LoanStatusRepaid {
		updates["repaid_at"] = time.Now().Unix()
	}
	return DB.Model(&GringottsLoan{}).Where("id = ?", id).Updates(updates).Error
}

// GetUserTotalOutstanding returns total outstanding (principal - principal_paid + interest_accrued - interest_paid) for a user
func GetUserTotalOutstanding(userId int) (int64, error) {
	var result struct {
		Total int64 `gorm:"column:total"`
	}
	err := DB.Model(&GringottsLoan{}).
		Where("user_id = ? AND status IN (?, ?)", userId, LoanStatusActive, LoanStatusOverdue).
		Select("COALESCE(SUM(amount - principal_paid + interest_accrued - interest_paid), 0) as total").
		Scan(&result).Error
	return result.Total, err
}

// DeadbeatEntry represents a user's total outstanding debt
type DeadbeatEntry struct {
	UserId    int    `json:"user_id" gorm:"column:user_id"`
	Username  string `json:"username" gorm:"column:username"`
	TotalDebt int64  `json:"total_debt" gorm:"column:total_debt"`
}

// GetDeadbeatLeaderboard returns top 20 users by total outstanding debt
func GetDeadbeatLeaderboard() ([]DeadbeatEntry, error) {
	var entries []DeadbeatEntry
	err := DB.Table("gringotts_loans").
		Select("gringotts_loans.user_id, users.username, SUM(gringotts_loans.amount - gringotts_loans.principal_paid + gringotts_loans.interest_accrued - gringotts_loans.interest_paid) as total_debt").
		Joins("JOIN users ON users.id = gringotts_loans.user_id").
		Where("gringotts_loans.status IN (?, ?)", LoanStatusActive, LoanStatusOverdue).
		Group("gringotts_loans.user_id, users.username").
		Having("SUM(gringotts_loans.amount - gringotts_loans.principal_paid + gringotts_loans.interest_accrued - gringotts_loans.interest_paid) > 0").
		Order("total_debt desc").
		Limit(20).
		Find(&entries).Error
	return entries, err
}

// GetLoanTotalOutstanding returns total outstanding across all users
func GetLoanTotalOutstanding() int64 {
	var result struct {
		Total int64 `gorm:"column:total"`
	}
	DB.Model(&GringottsLoan{}).
		Where("status IN (?, ?)", LoanStatusActive, LoanStatusOverdue).
		Select("COALESCE(SUM(amount - principal_paid + interest_accrued - interest_paid), 0) as total").
		Scan(&result)
	return result.Total
}

// GetLoanTotalInterestEarned returns total interest paid back by borrowers
func GetLoanTotalInterestEarned() int64 {
	var result struct {
		Total int64 `gorm:"column:total"`
	}
	DB.Model(&GringottsLoan{}).
		Select("COALESCE(SUM(interest_paid), 0) as total").
		Scan(&result)
	return result.Total
}

// GetOverdueLoanCount returns count of overdue loans
func GetOverdueLoanCount() int64 {
	var count int64
	DB.Model(&GringottsLoan{}).Where("status = ?", LoanStatusOverdue).Count(&count)
	return count
}

// ==================== Loan Credit (用户信用额度) ====================

type GringottsLoanCredit struct {
	Id          int   `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId      int   `json:"user_id" gorm:"uniqueIndex:idx_loan_credit_user"`
	CreditLimit int   `json:"credit_limit" gorm:"default:0"` // 自定义信用额度 (quota), 0=使用默认
	UpdatedAt   int64 `json:"updated_at" gorm:"bigint"`
}

func (GringottsLoanCredit) TableName() string {
	return "gringotts_loan_credits"
}

// GetUserCreditLimit returns custom credit limit for a user, or nil if not set
func GetUserCreditLimit(userId int) (*GringottsLoanCredit, error) {
	var credit GringottsLoanCredit
	err := DB.Where("user_id = ?", userId).First(&credit).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &credit, err
}

// SetUserCreditLimit sets or updates custom credit limit for a user
func SetUserCreditLimit(userId int, creditLimit int) error {
	var credit GringottsLoanCredit
	err := DB.Where("user_id = ?", userId).First(&credit).Error
	if err == gorm.ErrRecordNotFound {
		credit = GringottsLoanCredit{
			UserId:      userId,
			CreditLimit: creditLimit,
			UpdatedAt:   time.Now().Unix(),
		}
		return DB.Create(&credit).Error
	}
	if err != nil {
		return err
	}
	return DB.Model(&GringottsLoanCredit{}).Where("id = ?", credit.Id).Updates(map[string]interface{}{
		"credit_limit": creditLimit,
		"updated_at":   time.Now().Unix(),
	}).Error
}
