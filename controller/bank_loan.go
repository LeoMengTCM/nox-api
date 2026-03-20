package controller

import (
	"math"
	"net/http"

	"github.com/LeoMengTCM/nox-api/common"
	"github.com/LeoMengTCM/nox-api/model"
	"github.com/LeoMengTCM/nox-api/service"
	"github.com/gin-gonic/gin"
)

// convertLoan converts a GringottsLoan to dollar-based map
func convertLoan(loan model.GringottsLoan) map[string]interface{} {
	return map[string]interface{}{
		"id":               loan.Id,
		"user_id":          loan.UserId,
		"amount":           quotaToDollar(loan.Amount),
		"interest_accrued": quotaToDollar(loan.InterestAccrued),
		"interest_paid":    quotaToDollar(loan.InterestPaid),
		"principal_paid":   quotaToDollar(loan.PrincipalPaid),
		"annual_rate":      loan.AnnualRate,
		"term_days":        loan.TermDays,
		"status":           loan.Status,
		"due_at":           loan.DueAt,
		"created_at":       loan.CreatedAt,
		"repaid_at":        loan.RepaidAt,
	}
}

func GetLoanInfo(c *gin.Context) {
	userId := c.GetInt("id")
	info, err := service.GetLoanInfo(userId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}

	result := make(map[string]interface{})

	// Convert loans
	if loans, ok := info["loans"].([]model.GringottsLoan); ok {
		converted := make([]map[string]interface{}, len(loans))
		for i, l := range loans {
			converted[i] = convertLoan(l)
		}
		result["loans"] = converted
	}

	// Convert quota values to dollars
	result["credit_limit"] = quotaToDollar(info["credit_limit"].(int))
	result["used_credit"] = quotaToDollar64(info["used_credit"].(int64))
	result["available_credit"] = quotaToDollar64(info["available_credit"].(int64))
	result["min_loan_amount"] = quotaToDollar(info["min_loan_amount"].(int))

	// Pass through non-quota values
	result["max_active_loans"] = info["max_active_loans"]
	result["loan_rate_1"] = info["loan_rate_1"]
	result["loan_rate_3"] = info["loan_rate_3"]
	result["loan_rate_7"] = info["loan_rate_7"]
	result["loan_rate_14"] = info["loan_rate_14"]
	result["loan_rate_30"] = info["loan_rate_30"]

	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

func BorrowLoan(c *gin.Context) {
	userId := c.GetInt("id")
	var req struct {
		Amount   float64 `json:"amount"`
		TermDays int     `json:"term_days"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Amount <= 0 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "请输入有效金额"})
		return
	}
	quotaAmount := dollarToQuota(req.Amount)
	result, err := service.CreateLoan(userId, quotaAmount, req.TermDays)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	// Convert loan in result
	if loan, ok := result["loan"].(*model.GringottsLoan); ok {
		result["loan"] = convertLoan(*loan)
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

func RepayLoan(c *gin.Context) {
	userId := c.GetInt("id")
	var req struct {
		LoanId int     `json:"loan_id"`
		Amount float64 `json:"amount"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Amount <= 0 || req.LoanId <= 0 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "请输入有效金额和贷款ID"})
		return
	}
	quotaAmount := dollarToQuota(req.Amount)
	result, err := service.RepayLoan(userId, req.LoanId, quotaAmount)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	// Convert amounts to dollars
	if v, ok := result["interest_payment"].(int); ok {
		result["interest_payment"] = quotaToDollar(v)
	}
	if v, ok := result["principal_payment"].(int); ok {
		result["principal_payment"] = quotaToDollar(v)
	}
	if v, ok := result["total_payment"].(int); ok {
		result["total_payment"] = quotaToDollar(v)
	}
	if v, ok := result["remaining_debt"].(int); ok {
		result["remaining_debt"] = quotaToDollar(v)
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

func GetDeadbeatLeaderboard(c *gin.Context) {
	entries, err := service.GetDeadbeatLeaderboard()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	// Convert to dollars
	converted := make([]map[string]interface{}, len(entries))
	for i, e := range entries {
		converted[i] = map[string]interface{}{
			"user_id":    e.UserId,
			"username":   e.Username,
			"total_debt": float64(e.TotalDebt) / common.QuotaPerUnit,
		}
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": converted})
}

func AdminSetUserCredit(c *gin.Context) {
	var req struct {
		UserId      int     `json:"user_id"`
		CreditLimit float64 `json:"credit_limit"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.UserId <= 0 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "请输入有效用户ID"})
		return
	}
	quotaAmount := int(math.Round(req.CreditLimit * common.QuotaPerUnit))
	if err := service.AdminSetUserCredit(req.UserId, quotaAmount); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "信用额度设置成功"})
}
