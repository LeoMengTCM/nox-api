package service

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"github.com/LeoMengTCM/nox-api/common"
	"github.com/LeoMengTCM/nox-api/logger"
	"github.com/LeoMengTCM/nox-api/model"
	"github.com/LeoMengTCM/nox-api/setting/operation_setting"

	"github.com/bytedance/gopkg/util/gopool"
)

const bankInterestTickInterval = 1 * time.Hour

var (
	bankInterestOnce    sync.Once
	bankInterestRunning atomic.Bool
)

func StartBankInterestTask() {
	bankInterestOnce.Do(func() {
		if !common.IsMasterNode {
			return
		}
		gopool.Go(func() {
			logger.LogInfo(context.Background(), fmt.Sprintf("bank interest task started: tick=%s", bankInterestTickInterval))
			ticker := time.NewTicker(bankInterestTickInterval)
			defer ticker.Stop()

			// Don't run immediately on startup — wait for first tick
			for range ticker.C {
				runBankInterestOnce()
			}
		})
	})
}

func runBankInterestOnce() {
	if !bankInterestRunning.CompareAndSwap(false, true) {
		return
	}
	defer bankInterestRunning.Store(false)

	if !operation_setting.IsBankEnabled() {
		return
	}

	ctx := context.Background()
	now := time.Now().Unix()

	// 1. Process demand interest
	processDemandInterest(ctx, now)

	// 2. Process matured fixed deposits
	processMaturedFixedDeposits(ctx)
}

func processDemandInterest(ctx context.Context, now int64) {
	pool := operation_setting.GetBankPool()
	if pool <= 0 {
		return
	}

	accounts, err := model.GetAllActiveBankAccounts()
	if err != nil {
		logger.LogWarn(ctx, fmt.Sprintf("bank interest: failed to get accounts: %v", err))
		return
	}
	if len(accounts) == 0 {
		return
	}

	rate := operation_setting.GetDemandRate()
	// hourly rate = annual_rate / (365 * 24 * 10000)
	// Using int64 arithmetic to avoid overflow: interest = balance * rate / (365 * 24 * 10000)
	var totalInterest int64
	type interestItem struct {
		account  model.BankAccount
		interest int
	}
	var items []interestItem

	for _, acc := range accounts {
		interest := int64(acc.Balance) * int64(rate) / (365 * 24 * 10000)
		if interest < 1 {
			continue
		}
		items = append(items, interestItem{account: acc, interest: int(interest)})
		totalInterest += interest
	}

	if totalInterest == 0 {
		return
	}

	// If pool is insufficient, scale down proportionally
	scale := float64(1.0)
	if totalInterest > pool {
		scale = float64(pool) / float64(totalInterest)
		totalInterest = pool
	}

	// Apply interest to each account
	paid := 0
	for _, item := range items {
		interest := item.interest
		if scale < 1.0 {
			interest = int(float64(interest) * scale)
		}
		if interest < 1 {
			continue
		}

		newBalance := item.account.Balance + interest
		newInterestEarned := item.account.TotalInterestEarned + interest
		err := model.UpdateBankAccountBalance(item.account.Id, newBalance, newInterestEarned, now)
		if err != nil {
			logger.LogWarn(ctx, fmt.Sprintf("bank interest: failed to update account %d: %v", item.account.Id, err))
			continue
		}

		_ = model.CreateBankTransaction(&model.BankTransaction{
			UserId:       item.account.UserId,
			TxType:       "demand_interest",
			Amount:       interest,
			BalanceAfter: newBalance,
			Description:  fmt.Sprintf("活期利息 (年化 %d‱)", rate),
		})
		paid += interest
	}

	// Deduct from pool
	if paid > 0 {
		newPool := pool - int64(paid)
		if newPool < 0 {
			newPool = 0
		}
		operation_setting.SetBankPoolMemory(newPool)
		_ = model.UpdateOption("bank_setting.bank_pool", fmt.Sprintf("%d", newPool))
		logger.LogInfo(ctx, fmt.Sprintf("bank interest: paid %d to %d accounts, pool: %d -> %d", paid, len(items), pool, newPool))
	}
}

func processMaturedFixedDeposits(ctx context.Context) {
	deposits, err := model.GetMaturedFixedDeposits()
	if err != nil {
		logger.LogWarn(ctx, fmt.Sprintf("bank interest: failed to get matured deposits: %v", err))
		return
	}

	for _, deposit := range deposits {
		interest := calculateFixedInterest(deposit.Amount, deposit.AnnualRate, deposit.TermDays)

		// Check pool
		pool := operation_setting.GetBankPool()
		if int64(interest) > pool {
			interest = int(pool)
		}

		// Update deposit status to matured
		if err := model.UpdateFixedDepositStatus(deposit.Id, model.FixedStatusMatured, interest); err != nil {
			logger.LogWarn(ctx, fmt.Sprintf("bank interest: failed to update fixed deposit %d: %v", deposit.Id, err))
			continue
		}

		// Deduct interest from pool
		if interest > 0 {
			newPool := pool - int64(interest)
			if newPool < 0 {
				newPool = 0
			}
			operation_setting.SetBankPoolMemory(newPool)
			_ = model.UpdateOption("bank_setting.bank_pool", fmt.Sprintf("%d", newPool))
		}

		logger.LogInfo(ctx, fmt.Sprintf("bank: fixed deposit %d matured, user %d, principal %d, interest %d",
			deposit.Id, deposit.UserId, deposit.Amount, interest))
	}
}
