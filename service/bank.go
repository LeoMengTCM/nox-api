package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/LeoMengTCM/nox-api/logger"
	"github.com/LeoMengTCM/nox-api/model"
	"github.com/LeoMengTCM/nox-api/setting/operation_setting"
)

// GetBankInfo returns bank info for the user dashboard
func GetBankInfo(userId int) (map[string]interface{}, error) {
	if !operation_setting.IsBankEnabled() {
		return nil, errors.New("银行系统未启用")
	}

	account, err := model.GetOrCreateBankAccount(userId)
	if err != nil {
		return nil, err
	}

	fixedDeposits, err := model.GetUserFixedDeposits(userId)
	if err != nil {
		return nil, err
	}

	setting := operation_setting.GetBankSetting()

	return map[string]interface{}{
		"account":         account,
		"fixed_deposits":  fixedDeposits,
		"bank_pool":       setting.BankPool,
		"demand_rate":     operation_setting.GetDemandRate(),
		"fixed_rate_7":    operation_setting.GetFixedRate(7),
		"fixed_rate_30":   operation_setting.GetFixedRate(30),
		"fixed_rate_90":   operation_setting.GetFixedRate(90),
		"min_deposit":     operation_setting.GetMinDeposit(),
		"max_demand":      operation_setting.GetMaxDemandBalance(),
		"max_fixed_count": operation_setting.GetMaxFixedPerUser(),
		"early_penalty":   operation_setting.GetEarlyWithdrawPenalty(),
	}, nil
}

// DemandDeposit deposits quota from user wallet into demand account
func DemandDeposit(userId int, amount int) (map[string]interface{}, error) {
	if !operation_setting.IsBankEnabled() {
		return nil, errors.New("银行系统未启用")
	}
	if amount < operation_setting.GetMinDeposit() {
		return nil, fmt.Errorf("最小存入金额: %d", operation_setting.GetMinDeposit())
	}

	account, err := model.GetOrCreateBankAccount(userId)
	if err != nil {
		return nil, err
	}

	if account.Balance+amount > operation_setting.GetMaxDemandBalance() {
		return nil, fmt.Errorf("活期余额上限: %d", operation_setting.GetMaxDemandBalance())
	}

	// Deduct from user wallet (atomic)
	ok, err := model.SafeDecreaseQuotaForBet(userId, amount)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, errors.New("钱包余额不足")
	}

	// Add to bank account
	newBalance, err := model.AtomicDepositBank(userId, amount)
	if err != nil {
		// Rollback wallet deduction
		_ = model.IncreaseUserQuota(userId, amount, true)
		return nil, err
	}

	// Record transaction
	_ = model.CreateBankTransaction(&model.BankTransaction{
		UserId:       userId,
		TxType:       "demand_deposit",
		Amount:       amount,
		BalanceAfter: newBalance,
		Description:  fmt.Sprintf("活期存入 %d", amount),
	})

	model.RecordLog(userId, model.LogTypeSystem, fmt.Sprintf("银行活期存入 %d", amount))

	return map[string]interface{}{
		"balance": newBalance,
	}, nil
}

// DemandWithdraw withdraws from demand account back to user wallet
func DemandWithdraw(userId int, amount int) (map[string]interface{}, error) {
	if !operation_setting.IsBankEnabled() {
		return nil, errors.New("银行系统未启用")
	}
	if amount <= 0 {
		return nil, errors.New("取出金额必须大于0")
	}

	ok, newBalance, err := model.AtomicWithdrawBank(userId, amount)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, errors.New("银行余额不足")
	}

	// Add back to user wallet
	_ = model.IncreaseUserQuota(userId, amount, true)

	_ = model.CreateBankTransaction(&model.BankTransaction{
		UserId:       userId,
		TxType:       "demand_withdraw",
		Amount:       amount,
		BalanceAfter: newBalance,
		Description:  fmt.Sprintf("活期取出 %d", amount),
	})

	model.RecordLog(userId, model.LogTypeSystem, fmt.Sprintf("银行活期取出 %d", amount))

	return map[string]interface{}{
		"balance": newBalance,
	}, nil
}

// FixedDeposit creates a new fixed deposit
func CreateFixedDeposit(userId int, amount int, termDays int) (map[string]interface{}, error) {
	if !operation_setting.IsBankEnabled() {
		return nil, errors.New("银行系统未启用")
	}

	rate := operation_setting.GetFixedRate(termDays)
	if rate == 0 {
		return nil, errors.New("不支持的定期期限，仅支持 7/30/90 天")
	}

	if amount < operation_setting.GetMinDeposit() {
		return nil, fmt.Errorf("最小存入金额: %d", operation_setting.GetMinDeposit())
	}

	// Check max fixed count
	count, err := model.GetUserActiveFixedCount(userId)
	if err != nil {
		return nil, err
	}
	if count >= int64(operation_setting.GetMaxFixedPerUser()) {
		return nil, fmt.Errorf("定期存单上限: %d", operation_setting.GetMaxFixedPerUser())
	}

	// Deduct from user wallet
	ok, err := model.SafeDecreaseQuotaForBet(userId, amount)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, errors.New("钱包余额不足")
	}

	now := time.Now().Unix()
	deposit := &model.FixedDeposit{
		UserId:     userId,
		Amount:     amount,
		AnnualRate: rate,
		TermDays:   termDays,
		DepositAt:  now,
		MatureAt:   now + int64(termDays)*86400,
		Status:     model.FixedStatusActive,
	}
	if err := model.CreateFixedDeposit(deposit); err != nil {
		_ = model.IncreaseUserQuota(userId, amount, true)
		return nil, err
	}

	_ = model.CreateBankTransaction(&model.BankTransaction{
		UserId:      userId,
		TxType:      "fixed_deposit",
		Amount:      amount,
		Description: fmt.Sprintf("定期存入 %d天 金额 %d 利率 %d‱", termDays, amount, rate),
		RelatedId:   deposit.Id,
	})

	model.RecordLog(userId, model.LogTypeSystem, fmt.Sprintf("银行定期存入 %d天 金额 %d", termDays, amount))

	return map[string]interface{}{
		"deposit": deposit,
	}, nil
}

// WithdrawFixedDeposit withdraws a fixed deposit (matured or early)
func WithdrawFixedDeposit(userId int, depositId int) (map[string]interface{}, error) {
	if !operation_setting.IsBankEnabled() {
		return nil, errors.New("银行系统未启用")
	}

	deposit, err := model.GetFixedDepositById(depositId, userId)
	if err != nil {
		return nil, err
	}
	if deposit == nil {
		return nil, errors.New("存单不存在")
	}
	if deposit.Status == model.FixedStatusWithdrawn || deposit.Status == model.FixedStatusEarly {
		return nil, errors.New("存单已取出")
	}

	now := time.Now().Unix()
	var interest int
	var newStatus int
	var txType string
	var desc string

	if now >= deposit.MatureAt || deposit.Status == model.FixedStatusMatured {
		// Matured — full interest
		interest = calculateFixedInterest(deposit.Amount, deposit.AnnualRate, deposit.TermDays)
		newStatus = model.FixedStatusWithdrawn
		txType = "fixed_mature"
		desc = fmt.Sprintf("定期到期取出 本金 %d + 利息 %d", deposit.Amount, interest)
	} else {
		// Early withdrawal — penalty on interest
		elapsed := now - deposit.DepositAt
		if elapsed < 0 {
			elapsed = 0
		}
		daysElapsed := int(elapsed / 86400)
		if daysElapsed < 1 {
			daysElapsed = 1
		}
		fullInterest := calculateFixedInterest(deposit.Amount, deposit.AnnualRate, daysElapsed)
		penalty := fullInterest * operation_setting.GetEarlyWithdrawPenalty() / 100
		interest = fullInterest - penalty
		if interest < 0 {
			interest = 0
		}
		newStatus = model.FixedStatusEarly
		txType = "fixed_early_withdraw"
		desc = fmt.Sprintf("定期提前取出 本金 %d + 利息 %d (罚没 %d)", deposit.Amount, interest, penalty)
	}

	// Check bank pool for interest
	pool := operation_setting.GetBankPool()
	if int64(interest) > pool {
		interest = int(pool)
	}

	totalPayout := deposit.Amount + interest

	// Update deposit status
	if err := model.UpdateFixedDepositStatus(depositId, newStatus, interest); err != nil {
		return nil, err
	}

	// Deduct interest from pool
	if interest > 0 {
		newPool := pool - int64(interest)
		operation_setting.SetBankPoolMemory(newPool)
		_ = model.UpdateOption("bank_setting.bank_pool", fmt.Sprintf("%d", newPool))
	}

	// Pay user
	_ = model.IncreaseUserQuota(userId, totalPayout, true)

	_ = model.CreateBankTransaction(&model.BankTransaction{
		UserId:      userId,
		TxType:      txType,
		Amount:      totalPayout,
		Description: desc,
		RelatedId:   depositId,
	})

	model.RecordLog(userId, model.LogTypeSystem, fmt.Sprintf("银行定期取出 %s", desc))

	return map[string]interface{}{
		"principal": deposit.Amount,
		"interest":  interest,
		"total":     totalPayout,
		"status":    newStatus,
	}, nil
}

// calculateFixedInterest: amount × rate / 10000 × days / 365
func calculateFixedInterest(amount int, annualRate int, days int) int {
	// Use int64 to avoid overflow
	interest := int64(amount) * int64(annualRate) * int64(days) / (10000 * 365)
	return int(interest)
}

// GetBankTransactions returns paginated transaction history
func GetBankTransactions(userId int, page, perPage int) ([]model.BankTransaction, int64, error) {
	return model.GetBankTransactions(userId, page, perPage)
}

// AdminGetBankStats returns aggregate bank statistics
func AdminGetBankStats() map[string]interface{} {
	setting := operation_setting.GetBankSetting()
	return map[string]interface{}{
		"bank_pool":            setting.BankPool,
		"demand_total":         model.GetBankTotalDeposits(),
		"fixed_total":          model.GetFixedTotalDeposits(),
		"demand_interest_paid": model.GetBankTotalInterestPaid(),
		"fixed_interest_paid":  model.GetFixedTotalInterestPaid(),
		"account_count":        model.GetBankAccountCount(),
	}
}

// AdminInjectPool injects or withdraws from the bank pool
func AdminInjectPool(amount int64, action string) error {
	pool := operation_setting.GetBankPool()
	switch action {
	case "inject":
		pool += amount
	case "withdraw":
		if amount > pool {
			return errors.New("资金池余额不足")
		}
		pool -= amount
	default:
		return errors.New("无效操作")
	}
	operation_setting.SetBankPoolMemory(pool)
	err := model.UpdateOption("bank_setting.bank_pool", fmt.Sprintf("%d", pool))
	if err != nil {
		return err
	}
	logger.LogInfo(context.Background(), fmt.Sprintf("bank pool %s: %d, new pool: %d", action, amount, pool))
	return nil
}
