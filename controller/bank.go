package controller

import (
	"math"
	"net/http"
	"strconv"

	"github.com/LeoMengTCM/nox-api/common"
	"github.com/LeoMengTCM/nox-api/model"
	"github.com/LeoMengTCM/nox-api/service"
	"github.com/gin-gonic/gin"
)

// ---- Dollar ↔ Quota conversion (API boundary) ----

func dollarToQuota(dollar float64) int {
	return int(math.Round(dollar * common.QuotaPerUnit))
}

func quotaToDollar(quota int) float64 {
	return float64(quota) / common.QuotaPerUnit
}

func quotaToDollar64(quota int64) float64 {
	return float64(quota) / common.QuotaPerUnit
}

// convertAccount converts a BankAccount to dollar-based map
func convertAccount(acc *model.BankAccount) map[string]interface{} {
	if acc == nil {
		return nil
	}
	return map[string]interface{}{
		"id":                    acc.Id,
		"user_id":               acc.UserId,
		"account_type":          acc.AccountType,
		"balance":               quotaToDollar(acc.Balance),
		"total_interest_earned": quotaToDollar(acc.TotalInterestEarned),
		"last_interest_at":      acc.LastInterestAt,
		"created_at":            acc.CreatedAt,
	}
}

// convertFixedDeposit converts a FixedDeposit to dollar-based map
func convertFixedDeposit(d model.FixedDeposit) map[string]interface{} {
	return map[string]interface{}{
		"id":              d.Id,
		"user_id":         d.UserId,
		"amount":          quotaToDollar(d.Amount),
		"annual_rate":     d.AnnualRate,
		"term_days":       d.TermDays,
		"interest_earned": quotaToDollar(d.InterestEarned),
		"deposit_at":      d.DepositAt,
		"mature_at":       d.MatureAt,
		"status":          d.Status,
		"created_at":      d.CreatedAt,
	}
}

// convertTransaction converts a BankTransaction to dollar-based map
func convertTransaction(tx model.BankTransaction) map[string]interface{} {
	return map[string]interface{}{
		"id":            tx.Id,
		"user_id":       tx.UserId,
		"tx_type":       tx.TxType,
		"amount":        quotaToDollar(tx.Amount),
		"balance_after": quotaToDollar(tx.BalanceAfter),
		"description":   tx.Description,
		"related_id":    tx.RelatedId,
		"created_at":    tx.CreatedAt,
	}
}

// ==================== User endpoints ====================

func GetBankInfo(c *gin.Context) {
	userId := c.GetInt("id")
	info, err := service.GetBankInfo(userId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}

	// Convert quota values to dollars in the response
	result := make(map[string]interface{})

	// Convert accounts
	if acc, ok := info["account"].(*model.BankAccount); ok {
		result["account"] = convertAccount(acc)
	}
	if acc, ok := info["premium_account"].(*model.BankAccount); ok && acc != nil {
		result["premium_account"] = convertAccount(acc)
	} else {
		result["premium_account"] = nil
	}

	// Convert fixed deposits
	if deposits, ok := info["fixed_deposits"].([]model.FixedDeposit); ok {
		converted := make([]map[string]interface{}, len(deposits))
		for i, d := range deposits {
			converted[i] = convertFixedDeposit(d)
		}
		result["fixed_deposits"] = converted
	}

	// Convert quota-based settings to dollars
	result["bank_pool"] = quotaToDollar64(info["bank_pool"].(int64))
	result["min_deposit"] = quotaToDollar(info["min_deposit"].(int))
	result["min_premium_deposit"] = quotaToDollar(info["min_premium_deposit"].(int))
	result["max_demand"] = quotaToDollar(info["max_demand"].(int))
	result["max_premium"] = quotaToDollar(info["max_premium"].(int))

	// Pass through non-quota values as-is
	result["demand_rate"] = info["demand_rate"]
	result["premium_demand_rate"] = info["premium_demand_rate"]
	result["fixed_rate_7"] = info["fixed_rate_7"]
	result["fixed_rate_30"] = info["fixed_rate_30"]
	result["fixed_rate_90"] = info["fixed_rate_90"]
	result["max_fixed_count"] = info["max_fixed_count"]
	result["early_penalty"] = info["early_penalty"]

	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

func BankDemandDeposit(c *gin.Context) {
	userId := c.GetInt("id")
	var req struct {
		Amount      float64 `json:"amount"`
		AccountType int     `json:"account_type"` // 0=普通活期, 1=高息活期
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Amount <= 0 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "请输入有效金额"})
		return
	}
	quotaAmount := dollarToQuota(req.Amount)
	result, err := service.DemandDeposit(userId, quotaAmount, req.AccountType)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	// Convert balance back to dollars
	if bal, ok := result["balance"].(int); ok {
		result["balance"] = quotaToDollar(bal)
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

func BankDemandWithdraw(c *gin.Context) {
	userId := c.GetInt("id")
	var req struct {
		Amount      float64 `json:"amount"`
		AccountType int     `json:"account_type"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Amount <= 0 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "请输入有效金额"})
		return
	}
	quotaAmount := dollarToQuota(req.Amount)
	result, err := service.DemandWithdraw(userId, quotaAmount, req.AccountType)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	if bal, ok := result["balance"].(int); ok {
		result["balance"] = quotaToDollar(bal)
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

func BankFixedDeposit(c *gin.Context) {
	userId := c.GetInt("id")
	var req struct {
		Amount float64 `json:"amount"`
		Term   int     `json:"term"` // 7, 30, 90
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Amount <= 0 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "请输入有效金额"})
		return
	}
	quotaAmount := dollarToQuota(req.Amount)
	result, err := service.CreateFixedDeposit(userId, quotaAmount, req.Term)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	// Convert deposit in result
	if dep, ok := result["deposit"].(*model.FixedDeposit); ok {
		result["deposit"] = convertFixedDeposit(*dep)
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

func BankFixedWithdraw(c *gin.Context) {
	userId := c.GetInt("id")
	var req struct {
		DepositId int `json:"deposit_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.DepositId <= 0 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "请输入有效存单ID"})
		return
	}
	result, err := service.WithdrawFixedDeposit(userId, req.DepositId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	// Convert amounts to dollars
	if v, ok := result["principal"].(int); ok {
		result["principal"] = quotaToDollar(v)
	}
	if v, ok := result["interest"].(int); ok {
		result["interest"] = quotaToDollar(v)
	}
	if v, ok := result["total"].(int); ok {
		result["total"] = quotaToDollar(v)
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

func GetBankTransactions(c *gin.Context) {
	userId := c.GetInt("id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 50 {
		perPage = 20
	}

	txs, total, err := service.GetBankTransactions(userId, page, perPage)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}

	// Convert transactions to dollars
	converted := make([]map[string]interface{}, len(txs))
	for i, tx := range txs {
		converted[i] = convertTransaction(tx)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"items": converted,
			"total": total,
		},
	})
}

// ==================== Admin endpoints ====================

func AdminGetBankStats(c *gin.Context) {
	stats := service.AdminGetBankStats()
	// Convert all quota values to dollars
	result := map[string]interface{}{
		"bank_pool":             quotaToDollar64(stats["bank_pool"].(int64)),
		"demand_total":          quotaToDollar64(stats["demand_total"].(int64)),
		"premium_total":         quotaToDollar64(stats["premium_total"].(int64)),
		"fixed_total":           quotaToDollar64(stats["fixed_total"].(int64)),
		"demand_interest_paid":  quotaToDollar64(stats["demand_interest_paid"].(int64)),
		"premium_interest_paid": quotaToDollar64(stats["premium_interest_paid"].(int64)),
		"fixed_interest_paid":   quotaToDollar64(stats["fixed_interest_paid"].(int64)),
		"account_count":         stats["account_count"],
		// Loan stats
		"loan_outstanding":     quotaToDollar64(stats["loan_outstanding"].(int64)),
		"loan_interest_earned": quotaToDollar64(stats["loan_interest_earned"].(int64)),
		"loan_overdue_count":   stats["loan_overdue_count"],
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

func AdminBankInject(c *gin.Context) {
	var req struct {
		Amount float64 `json:"amount"`
		Action string  `json:"action"` // "inject" or "withdraw"
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Amount <= 0 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "请输入有效金额"})
		return
	}
	quotaAmount := int64(math.Round(req.Amount * common.QuotaPerUnit))
	if err := service.AdminInjectPool(quotaAmount, req.Action); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "操作成功"})
}
