package service

import (
	"errors"
	"fmt"
	"time"

	"github.com/LeoMengTCM/nox-api/model"
	"github.com/LeoMengTCM/nox-api/setting/operation_setting"
)

// GetLoanInfo returns loan info for user dashboard
func GetLoanInfo(userId int) (map[string]interface{}, error) {
	if !operation_setting.IsBankEnabled() {
		return nil, errors.New("银行系统未启用")
	}
	if !operation_setting.IsLoanEnabled() {
		return nil, errors.New("贷款功能未启用")
	}

	// Determine credit limit
	creditLimit := operation_setting.GetDefaultCreditLimit()
	customCredit, err := model.GetUserCreditLimit(userId)
	if err != nil {
		return nil, err
	}
	if customCredit != nil && customCredit.CreditLimit > 0 {
		creditLimit = customCredit.CreditLimit
	}

	// Get active loans
	loans, err := model.GetUserActiveLoans(userId)
	if err != nil {
		return nil, err
	}

	// Calculate used credit
	var usedCredit int64
	for _, loan := range loans {
		usedCredit += int64(loan.Amount - loan.PrincipalPaid)
	}

	return map[string]interface{}{
		"credit_limit":    creditLimit,
		"used_credit":     usedCredit,
		"available_credit": int64(creditLimit) - usedCredit,
		"loans":           loans,
		"max_active_loans": operation_setting.GetMaxActiveLoans(),
		"min_loan_amount": operation_setting.GetMinLoanAmount(),
		"loan_rate_1":     operation_setting.GetLoanRate(1),
		"loan_rate_3":     operation_setting.GetLoanRate(3),
		"loan_rate_7":     operation_setting.GetLoanRate(7),
		"loan_rate_14":    operation_setting.GetLoanRate(14),
		"loan_rate_30":    operation_setting.GetLoanRate(30),
	}, nil
}

// CreateLoan creates a new loan for the user
func CreateLoan(userId int, amount int, termDays int) (map[string]interface{}, error) {
	if !operation_setting.IsBankEnabled() {
		return nil, errors.New("银行系统未启用")
	}
	if !operation_setting.IsLoanEnabled() {
		return nil, errors.New("贷款功能未启用")
	}

	rate := operation_setting.GetLoanRate(termDays)
	if rate == 0 {
		return nil, errors.New("不支持的贷款期限，仅支持 1/3/7/14/30 天")
	}

	if amount < operation_setting.GetMinLoanAmount() {
		return nil, fmt.Errorf("最小贷款金额: %d", operation_setting.GetMinLoanAmount())
	}

	// Check active loan count
	count, err := model.GetUserActiveLoanCount(userId)
	if err != nil {
		return nil, err
	}
	if count >= int64(operation_setting.GetMaxActiveLoans()) {
		return nil, fmt.Errorf("活跃贷款上限: %d", operation_setting.GetMaxActiveLoans())
	}

	// Check credit limit
	creditLimit := operation_setting.GetDefaultCreditLimit()
	customCredit, err := model.GetUserCreditLimit(userId)
	if err != nil {
		return nil, err
	}
	if customCredit != nil && customCredit.CreditLimit > 0 {
		creditLimit = customCredit.CreditLimit
	}

	outstanding, err := model.GetUserTotalOutstanding(userId)
	if err != nil {
		return nil, err
	}
	if outstanding+int64(amount) > int64(creditLimit) {
		return nil, errors.New("超出信用额度")
	}

	// Check bank pool
	pool := operation_setting.GetBankPool()
	if int64(amount) > pool {
		return nil, errors.New("银行资金池不足")
	}

	now := time.Now().Unix()
	loan := &model.GringottsLoan{
		UserId:     userId,
		Amount:     amount,
		AnnualRate: rate,
		TermDays:   termDays,
		Status:     model.LoanStatusActive,
		DueAt:      now + int64(termDays)*86400,
	}

	if err := model.CreateLoan(loan); err != nil {
		return nil, err
	}

	// Deduct from bank pool
	newPool := pool - int64(amount)
	operation_setting.SetBankPoolMemory(newPool)
	_ = model.UpdateOption("bank_setting.bank_pool", fmt.Sprintf("%d", newPool))

	// Add to user wallet
	_ = model.IncreaseUserQuota(userId, amount, true)

	// Record transaction
	_ = model.CreateBankTransaction(&model.BankTransaction{
		UserId:      userId,
		TxType:      "loan_borrow",
		Amount:      amount,
		Description: fmt.Sprintf("信用贷款 %d天 利率 %d‱ 金额 %d", termDays, rate, amount),
		RelatedId:   loan.Id,
	})

	model.RecordLog(userId, model.LogTypeSystem, fmt.Sprintf("银行贷款 %d天 金额 %d", termDays, amount))

	return map[string]interface{}{
		"loan": loan,
	}, nil
}

// RepayLoan repays part or all of a loan
func RepayLoan(userId int, loanId int, amount int) (map[string]interface{}, error) {
	if !operation_setting.IsBankEnabled() {
		return nil, errors.New("银行系统未启用")
	}
	if amount <= 0 {
		return nil, errors.New("还款金额必须大于0")
	}

	loan, err := model.GetLoanById(loanId, userId)
	if err != nil {
		return nil, err
	}
	if loan == nil {
		return nil, errors.New("贷款不存在")
	}
	if loan.Status == model.LoanStatusRepaid {
		return nil, errors.New("贷款已还清")
	}

	// Calculate remaining debt
	remainingInterest := loan.InterestAccrued - loan.InterestPaid
	remainingPrincipal := loan.Amount - loan.PrincipalPaid
	totalDebt := remainingInterest + remainingPrincipal

	if amount > totalDebt {
		amount = totalDebt // cap at total debt
	}

	// Deduct from user wallet
	ok, err := model.SafeDecreaseQuotaForBet(userId, amount)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, errors.New("钱包余额不足")
	}

	// Allocate payment: interest first, then principal
	interestPayment := 0
	principalPayment := 0

	if amount <= remainingInterest {
		interestPayment = amount
	} else {
		interestPayment = remainingInterest
		principalPayment = amount - remainingInterest
	}

	newInterestPaid := loan.InterestPaid + interestPayment
	newPrincipalPaid := loan.PrincipalPaid + principalPayment

	// Determine new status
	newStatus := loan.Status
	if newPrincipalPaid >= loan.Amount && newInterestPaid >= loan.InterestAccrued {
		newStatus = model.LoanStatusRepaid
	}

	// Update loan
	if err := model.UpdateLoanRepayment(loan.Id, newInterestPaid, newPrincipalPaid, loan.InterestAccrued, newStatus); err != nil {
		// Rollback wallet deduction
		_ = model.IncreaseUserQuota(userId, amount, true)
		return nil, err
	}

	// Return repayment to bank pool
	pool := operation_setting.GetBankPool()
	newPool := pool + int64(amount)
	operation_setting.SetBankPoolMemory(newPool)
	_ = model.UpdateOption("bank_setting.bank_pool", fmt.Sprintf("%d", newPool))

	// Record transaction
	desc := fmt.Sprintf("贷款还款 利息 %d + 本金 %d", interestPayment, principalPayment)
	if newStatus == model.LoanStatusRepaid {
		desc += " (已还清)"
	}
	_ = model.CreateBankTransaction(&model.BankTransaction{
		UserId:      userId,
		TxType:      "loan_repay",
		Amount:      amount,
		Description: desc,
		RelatedId:   loan.Id,
	})

	model.RecordLog(userId, model.LogTypeSystem, fmt.Sprintf("银行还款 %d (利息 %d + 本金 %d)", amount, interestPayment, principalPayment))

	return map[string]interface{}{
		"interest_payment":  interestPayment,
		"principal_payment": principalPayment,
		"total_payment":     amount,
		"status":            newStatus,
		"remaining_debt":    totalDebt - amount,
	}, nil
}

// GetDeadbeatLeaderboard returns top 20 users by outstanding debt
func GetDeadbeatLeaderboard() ([]model.DeadbeatEntry, error) {
	return model.GetDeadbeatLeaderboard()
}

// AdminGetLoanStats returns loan statistics for admin
func AdminGetLoanStats() map[string]interface{} {
	return map[string]interface{}{
		"loan_outstanding":      model.GetLoanTotalOutstanding(),
		"loan_interest_earned":  model.GetLoanTotalInterestEarned(),
		"loan_overdue_count":    model.GetOverdueLoanCount(),
	}
}

// AdminSetUserCredit sets custom credit limit for a user
func AdminSetUserCredit(userId int, creditLimit int) error {
	return model.SetUserCreditLimit(userId, creditLimit)
}
