package controller

import (
	"net/http"
	"strconv"

	"github.com/LeoMengTCM/nox-api/common"
	"github.com/LeoMengTCM/nox-api/model"
	"github.com/LeoMengTCM/nox-api/service"
	"github.com/gin-gonic/gin"
)

// ==================== User Market Handlers ====================

// enrichListings attaches pet and species info to each listing for frontend display.
// Uses batch queries to avoid N+1 performance problems.
func enrichListings(listings []model.PetMarketListing) []gin.H {
	if len(listings) == 0 {
		return []gin.H{}
	}

	// Collect pet IDs from all listings
	petIds := make([]int, 0, len(listings))
	for _, l := range listings {
		petIds = append(petIds, l.PetId)
	}

	// Batch fetch all pets in one query
	var pets []model.UserPet
	model.DB.Where("id IN ?", petIds).Find(&pets)
	petMap := make(map[int]*model.UserPet, len(pets))
	for i := range pets {
		petMap[pets[i].Id] = &pets[i]
	}

	// Collect unique species IDs from fetched pets
	speciesIds := make([]int, 0)
	seen := make(map[int]bool)
	for _, p := range pets {
		if !seen[p.SpeciesId] {
			seen[p.SpeciesId] = true
			speciesIds = append(speciesIds, p.SpeciesId)
		}
	}

	// Batch fetch all species in one query
	speciesMap := make(map[int]*model.PetSpecies)
	if len(speciesIds) > 0 {
		var speciesList []model.PetSpecies
		model.DB.Where("id IN ?", speciesIds).Find(&speciesList)
		for i := range speciesList {
			speciesMap[speciesList[i].Id] = &speciesList[i]
		}
	}

	// Build enriched results using the pre-fetched maps
	enriched := make([]gin.H, len(listings))
	for i, listing := range listings {
		item := gin.H{
			"id":                listing.Id,
			"seller_id":         listing.SellerId,
			"pet_id":            listing.PetId,
			"listing_type":      listing.ListingType,
			"price":             listing.Price,
			"min_bid":           listing.MinBid,
			"current_bid":       listing.CurrentBid,
			"current_bidder_id": listing.CurrentBidderId,
			"bid_count":         listing.BidCount,
			"expires_at":        listing.ExpiresAt,
			"status":            listing.Status,
			"created_at":        listing.CreatedAt,
			"updated_at":        listing.UpdatedAt,
		}
		if pet, ok := petMap[listing.PetId]; ok {
			petInfo := gin.H{
				"nickname":   pet.Nickname,
				"level":      pet.Level,
				"star":       pet.Star,
				"stage":      pet.Stage,
				"state":      pet.State,
				"species_id": pet.SpeciesId,
			}
			if sp, ok := speciesMap[pet.SpeciesId]; ok {
				petInfo["species_name"] = sp.Name
				petInfo["visual_key"] = sp.VisualKey
				petInfo["rarity"] = sp.Rarity
			}
			item["pet"] = petInfo
		}
		enriched[i] = item
	}
	return enriched
}

// GetMarketListings 获取市场挂单列表
func GetMarketListings(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	filters := model.MarketFilter{
		ListingType: c.Query("listing_type"),
		Rarity:      c.Query("rarity"),
		SortBy:      c.Query("sort_by"),
	}
	if v, err := strconv.Atoi(c.Query("species_id")); err == nil {
		filters.SpeciesId = v
	}
	if v, err := strconv.Atoi(c.Query("min_star")); err == nil {
		filters.MinStar = v
	}
	if v, err := strconv.Atoi(c.Query("max_star")); err == nil {
		filters.MaxStar = v
	}
	if v, err := strconv.Atoi(c.Query("min_price")); err == nil {
		filters.MinPrice = v
	}
	if v, err := strconv.Atoi(c.Query("max_price")); err == nil {
		filters.MaxPrice = v
	}

	listings, total, err := service.GetMarketListings(page, pageSize, filters)
	if err != nil {
		common.ApiErrorMsg(c, "获取市场列表失败")
		return
	}

	enriched := enrichListings(listings)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"list":  enriched,
			"total": total,
		},
	})
}

// GetListingDetail 获取挂单详情
func GetListingDetail(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的挂单 ID")
		return
	}

	listing, err := model.GetListingById(id)
	if err != nil {
		common.ApiErrorMsg(c, "挂单不存在")
		return
	}

	// Get pet info
	pet, _ := model.GetPetByIdGlobal(listing.PetId)

	// Get species info if pet exists
	var species *model.PetSpecies
	if pet != nil {
		species, _ = model.GetSpeciesById(pet.SpeciesId)
	}

	// Get bids if auction
	var bids []model.PetMarketBid
	if listing.ListingType == "auction" {
		bids, _ = model.GetBidsForListing(listing.Id)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"listing": listing,
			"pet":     pet,
			"species": species,
			"bids":    bids,
		},
	})
}

// CreateMarketListing 创建挂单
func CreateMarketListing(c *gin.Context) {
	var req struct {
		PetId       int    `json:"pet_id"`
		ListingType string `json:"listing_type"`
		Price       int    `json:"price"`
		MinBid      int    `json:"min_bid"`
		ExpiresAt   int64  `json:"expires_at"`
	}
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}
	if req.PetId <= 0 {
		common.ApiErrorMsg(c, "无效的宠物 ID")
		return
	}

	userId := c.GetInt("id")
	listing, err := service.CreateMarketListing(userId, req.PetId, req.ListingType, req.Price, req.MinBid, req.ExpiresAt)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "挂单创建成功",
		"data":    listing,
	})
}

// BuyMarketListing 一口价购买
func BuyMarketListing(c *gin.Context) {
	listingId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的挂单 ID")
		return
	}

	userId := c.GetInt("id")
	transaction, err := service.BuyListing(userId, listingId)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "购买成功",
		"data":    transaction,
	})
}

// PlaceMarketBid 竞拍出价
func PlaceMarketBid(c *gin.Context) {
	listingId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的挂单 ID")
		return
	}

	var req struct {
		Amount int `json:"amount"`
	}
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}
	if req.Amount <= 0 {
		common.ApiErrorMsg(c, "出价必须大于0")
		return
	}

	userId := c.GetInt("id")
	if err := service.PlaceBid(userId, listingId, req.Amount); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "出价成功",
	})
}

// CancelMarketListing 取消挂单
func CancelMarketListing(c *gin.Context) {
	listingId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的挂单 ID")
		return
	}

	userId := c.GetInt("id")
	if err := service.CancelListing(userId, listingId); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "挂单已取消",
	})
}

// GetMyMarketListings 获取我的挂单
func GetMyMarketListings(c *gin.Context) {
	userId := c.GetInt("id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	listings, total, err := model.GetUserListings(userId, page, pageSize)
	if err != nil {
		common.ApiErrorMsg(c, "获取挂单列表失败")
		return
	}

	enriched := enrichListings(listings)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"list":  enriched,
			"total": total,
		},
	})
}

// GetMyTransactions 获取我的交易历史
func GetMyTransactions(c *gin.Context) {
	userId := c.GetInt("id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	transactions, total, err := model.GetUserTransactions(userId, page, pageSize)
	if err != nil {
		common.ApiErrorMsg(c, "获取交易历史失败")
		return
	}

	// Batch fetch pets for all transactions
	txPetIds := make([]int, 0, len(transactions))
	for _, tx := range transactions {
		txPetIds = append(txPetIds, tx.PetId)
	}

	txPetMap := make(map[int]*model.UserPet)
	if len(txPetIds) > 0 {
		var txPets []model.UserPet
		model.DB.Where("id IN ?", txPetIds).Find(&txPets)
		for i := range txPets {
			txPetMap[txPets[i].Id] = &txPets[i]
		}
	}

	// Collect unique species IDs from fetched pets
	txSpeciesIds := make([]int, 0)
	txSeen := make(map[int]bool)
	for _, p := range txPetMap {
		if !txSeen[p.SpeciesId] {
			txSeen[p.SpeciesId] = true
			txSpeciesIds = append(txSpeciesIds, p.SpeciesId)
		}
	}

	// Batch fetch all species
	txSpeciesMap := make(map[int]*model.PetSpecies)
	if len(txSpeciesIds) > 0 {
		var txSpeciesList []model.PetSpecies
		model.DB.Where("id IN ?", txSpeciesIds).Find(&txSpeciesList)
		for i := range txSpeciesList {
			txSpeciesMap[txSpeciesList[i].Id] = &txSpeciesList[i]
		}
	}

	// Build enriched transaction results
	enrichedTxs := make([]gin.H, len(transactions))
	for i, tx := range transactions {
		item := gin.H{
			"id":           tx.Id,
			"listing_id":   tx.ListingId,
			"seller_id":    tx.SellerId,
			"buyer_id":     tx.BuyerId,
			"pet_id":       tx.PetId,
			"price":        tx.Price,
			"listing_type": tx.ListingType,
			"fee":          tx.Fee,
			"created_at":   tx.CreatedAt,
		}
		if pet, ok := txPetMap[tx.PetId]; ok {
			petInfo := gin.H{
				"nickname":   pet.Nickname,
				"level":      pet.Level,
				"star":       pet.Star,
				"stage":      pet.Stage,
				"state":      pet.State,
			}
			if sp, ok := txSpeciesMap[pet.SpeciesId]; ok {
				petInfo["species_name"] = sp.Name
				petInfo["visual_key"] = sp.VisualKey
				petInfo["rarity"] = sp.Rarity
			}
			item["pet"] = petInfo
		}
		enrichedTxs[i] = item
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"list":  enrichedTxs,
			"total": total,
		},
	})
}

// GetMarketPriceHistory 获取价格历史
func GetMarketPriceHistory(c *gin.Context) {
	speciesId, err := strconv.Atoi(c.Param("speciesId"))
	if err != nil || speciesId <= 0 {
		common.ApiErrorMsg(c, "无效的物种 ID")
		return
	}

	histories, err := model.GetPriceHistory(speciesId, 30)
	if err != nil {
		common.ApiErrorMsg(c, "获取价格历史失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    histories,
	})
}

// ==================== Admin Handlers ====================

// AdminGetUserPets 管理员获取用户宠物列表
func AdminGetUserPets(c *gin.Context) {
	userId, err := strconv.Atoi(c.Param("id"))
	if err != nil || userId <= 0 {
		common.ApiErrorMsg(c, "无效的用户 ID")
		return
	}

	pets, err := service.AdminGetUserPets(userId)
	if err != nil {
		common.ApiErrorMsg(c, "获取用户宠物失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    pets,
	})
}

// AdminGrantPet 管理员发放宠物
func AdminGrantPet(c *gin.Context) {
	var req struct {
		UserId    int `json:"user_id"`
		SpeciesId int `json:"species_id"`
		Level     int `json:"level"`
		Star      int `json:"star"`
	}
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}
	if req.UserId <= 0 || req.SpeciesId <= 0 {
		common.ApiErrorMsg(c, "用户 ID 和物种 ID 不能为空")
		return
	}

	pet, err := service.AdminGrantPet(req.UserId, req.SpeciesId, req.Level, req.Star)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    pet,
	})
}

// AdminGrantItem 管理员发放物品
func AdminGrantItem(c *gin.Context) {
	var req struct {
		UserId   int `json:"user_id"`
		ItemId   int `json:"item_id"`
		Quantity int `json:"quantity"`
	}
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}
	if req.UserId <= 0 || req.ItemId <= 0 {
		common.ApiErrorMsg(c, "用户 ID 和物品 ID 不能为空")
		return
	}

	if err := service.AdminGrantItem(req.UserId, req.ItemId, req.Quantity); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// AdminGetRecentMarketTransactions 管理员获取近期交易记录
func AdminGetRecentMarketTransactions(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if limit <= 0 || limit > 200 {
		limit = 50
	}

	transactions, err := service.AdminGetRecentTransactions(limit)
	if err != nil {
		common.ApiErrorMsg(c, "获取交易记录失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    transactions,
	})
}

// AdminGetPetStats 管理员获取宠物系统统计
func AdminGetPetStats(c *gin.Context) {
	stats, err := service.AdminGetPetSystemStats()
	if err != nil {
		common.ApiErrorMsg(c, "获取统计数据失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}
