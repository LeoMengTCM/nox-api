package service

import (
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/LeoMengTCM/nox-api/model"
	"github.com/LeoMengTCM/nox-api/setting/operation_setting"
	"gorm.io/gorm"
)

// CreateMarketListing creates a new market listing for a pet
func CreateMarketListing(userId, petId int, listingType string, price, minBid int, expiresAt int64) (*model.PetMarketListing, error) {
	if !operation_setting.IsPetEnabled() {
		return nil, errors.New("宠物系统未启用")
	}

	if listingType != "fixed_price" && listingType != "auction" {
		return nil, errors.New("无效的挂单类型")
	}
	if listingType == "fixed_price" && price <= 0 {
		return nil, errors.New("一口价必须大于0")
	}
	if listingType == "auction" && minBid <= 0 {
		return nil, errors.New("起拍价必须大于0")
	}
	if listingType == "auction" && expiresAt <= time.Now().Unix() {
		return nil, errors.New("竞拍结束时间必须在未来")
	}

	// Validate pet belongs to user and is in normal state
	pet, err := model.GetUserPetById(userId, petId)
	if err != nil {
		return nil, errors.New("宠物不存在")
	}
	if pet.State != "normal" {
		return nil, errors.New("宠物当前状态无法上架")
	}

	listing := &model.PetMarketListing{
		SellerId:    userId,
		PetId:       petId,
		ListingType: listingType,
		Price:       price,
		MinBid:      minBid,
		CurrentBid:  0,
		BidCount:    0,
		ExpiresAt:   expiresAt,
		Status:      "active",
	}

	now := time.Now().Unix()
	err = model.DB.Transaction(func(tx *gorm.DB) error {
		// Set pet state to listed
		pet.State = "listed"
		pet.UpdatedAt = now
		if err := tx.Save(pet).Error; err != nil {
			return fmt.Errorf("更新宠物状态失败: %w", err)
		}

		// Create listing
		listing.CreatedAt = now
		listing.UpdatedAt = now
		if err := tx.Create(listing).Error; err != nil {
			return fmt.Errorf("创建挂单失败: %w", err)
		}

		return nil
	})
	if err != nil {
		return nil, errors.New("创建挂单失败")
	}

	return listing, nil
}

// BuyListing processes a fixed-price purchase
func BuyListing(buyerId, listingId int) (*model.PetMarketTransaction, error) {
	if !operation_setting.IsPetEnabled() {
		return nil, errors.New("宠物系统未启用")
	}

	// Pre-check outside transaction for fast-fail (non-authoritative)
	listing, err := model.GetListingById(listingId)
	if err != nil {
		return nil, errors.New("挂单不存在")
	}
	if listing.Status != "active" {
		return nil, errors.New("挂单已关闭")
	}
	if listing.ListingType != "fixed_price" {
		return nil, errors.New("该挂单为竞拍类型，不能直接购买")
	}
	if listing.SellerId == buyerId {
		return nil, errors.New("不能购买自己的挂单")
	}

	price := listing.Price
	fee := int(float64(price) * operation_setting.GetMarketFeeRate())
	sellerReceives := price - fee

	// Check buyer has enough quota
	buyerQuota, err := model.GetUserQuota(buyerId, true)
	if err != nil {
		return nil, errors.New("获取买家额度失败")
	}
	if buyerQuota < price {
		return nil, errors.New("额度不足")
	}

	// Execute entire purchase in a transaction
	transaction := &model.PetMarketTransaction{
		ListingId:   listing.Id,
		SellerId:    listing.SellerId,
		BuyerId:     buyerId,
		PetId:       listing.PetId,
		Price:       price,
		ListingType: listing.ListingType,
		Fee:         fee,
	}

	now := time.Now().Unix()

	err = model.DB.Transaction(func(tx *gorm.DB) error {
		// Atomically claim the listing — prevents double-purchase race condition
		result := tx.Model(&model.PetMarketListing{}).
			Where("id = ? AND status = ?", listingId, "active").
			Updates(map[string]interface{}{
				"status":     "sold",
				"updated_at": now,
			})
		if result.Error != nil {
			return fmt.Errorf("更新挂单失败: %w", result.Error)
		}
		if result.RowsAffected == 0 {
			return errors.New("该宠物已被其他人购买")
		}

		// Deduct buyer quota
		if err := tx.Model(&model.User{}).Where("id = ?", buyerId).
			Update("quota", gorm.Expr("quota - ?", price)).Error; err != nil {
			return fmt.Errorf("扣除额度失败: %w", err)
		}

		// Add seller quota (minus fee)
		if err := tx.Model(&model.User{}).Where("id = ?", listing.SellerId).
			Update("quota", gorm.Expr("quota + ?", sellerReceives)).Error; err != nil {
			return fmt.Errorf("增加卖家额度失败: %w", err)
		}

		// Transfer pet ownership
		if err := tx.Model(&model.UserPet{}).Where("id = ?", listing.PetId).
			Updates(map[string]interface{}{
				"user_id":    buyerId,
				"state":      "normal",
				"is_primary": false,
				"updated_at": now,
			}).Error; err != nil {
			return fmt.Errorf("转移宠物失败: %w", err)
		}

		// Create transaction record
		transaction.CreatedAt = now
		if err := tx.Create(transaction).Error; err != nil {
			return fmt.Errorf("创建交易记录失败: %w", err)
		}

		return nil
	})

	if err != nil {
		if err.Error() == "该宠物已被其他人购买" {
			return nil, err
		}
		return nil, errors.New("交易失败")
	}

	return transaction, nil
}

// PlaceBid places a bid on an auction listing
func PlaceBid(bidderId, listingId, amount int) error {
	if !operation_setting.IsPetEnabled() {
		return errors.New("宠物系统未启用")
	}

	// Pre-check outside transaction for fast-fail (non-authoritative)
	listing, err := model.GetListingById(listingId)
	if err != nil {
		return errors.New("挂单不存在")
	}
	if listing.Status != "active" {
		return errors.New("挂单已关闭")
	}
	if listing.ListingType != "auction" {
		return errors.New("该挂单不是竞拍类型")
	}
	if listing.SellerId == bidderId {
		return errors.New("不能竞拍自己的挂单")
	}
	if listing.ExpiresAt <= time.Now().Unix() {
		return errors.New("竞拍已结束")
	}

	// Check bidder has enough quota
	bidderQuota, err := model.GetUserQuota(bidderId, true)
	if err != nil {
		return errors.New("获取额度失败")
	}
	if bidderQuota < amount {
		return errors.New("额度不足")
	}

	err = model.DB.Transaction(func(tx *gorm.DB) error {
		// Re-read listing inside transaction to get fresh state
		var freshListing model.PetMarketListing
		if err := tx.First(&freshListing, listingId).Error; err != nil {
			return errors.New("挂单不存在")
		}
		if freshListing.Status != "active" {
			return errors.New("挂单已关闭")
		}
		if freshListing.ExpiresAt <= time.Now().Unix() {
			return errors.New("竞拍已结束")
		}

		// Re-validate bid amount against fresh data
		minRequired := freshListing.MinBid
		if freshListing.CurrentBid > 0 {
			minRequired = int(float64(freshListing.CurrentBid) * (1.0 + operation_setting.GetAuctionBidIncrement()))
		}
		if amount < minRequired {
			return errors.New("出价需高于当前最高出价")
		}

		// Freeze (deduct) new bidder's quota
		if err := tx.Model(&model.User{}).Where("id = ?", bidderId).
			Update("quota", gorm.Expr("quota - ?", amount)).Error; err != nil {
			return fmt.Errorf("冻结额度失败: %w", err)
		}

		// Refund previous bidder using fresh data
		if freshListing.CurrentBidderId > 0 && freshListing.CurrentBid > 0 {
			if err := tx.Model(&model.User{}).Where("id = ?", freshListing.CurrentBidderId).
				Update("quota", gorm.Expr("quota + ?", freshListing.CurrentBid)).Error; err != nil {
				return fmt.Errorf("退还前一出价者额度失败: %w", err)
			}
		}

		// Update listing
		now := time.Now().Unix()
		if err := tx.Model(&model.PetMarketListing{}).Where("id = ?", listingId).
			Updates(map[string]interface{}{
				"current_bid":       amount,
				"current_bidder_id": bidderId,
				"bid_count":         freshListing.BidCount + 1,
				"updated_at":        now,
			}).Error; err != nil {
			return fmt.Errorf("更新挂单失败: %w", err)
		}

		// Create bid record
		bid := &model.PetMarketBid{
			ListingId: listingId,
			BidderId:  bidderId,
			Amount:    amount,
			CreatedAt: now,
		}
		if err := tx.Create(bid).Error; err != nil {
			return fmt.Errorf("创建出价记录失败: %w", err)
		}

		return nil
	})

	if err != nil {
		// Return specific errors for user-facing messages
		if err.Error() == "挂单不存在" || err.Error() == "挂单已关闭" ||
			err.Error() == "竞拍已结束" || err.Error() == "出价需高于当前最高出价" {
			return err
		}
		return errors.New("出价失败")
	}

	return nil
}

// CancelListing cancels a listing and restores the pet
func CancelListing(userId, listingId int) error {
	if !operation_setting.IsPetEnabled() {
		return errors.New("宠物系统未启用")
	}

	listing, err := model.GetListingById(listingId)
	if err != nil {
		return errors.New("挂单不存在")
	}
	if listing.SellerId != userId {
		return errors.New("无权取消该挂单")
	}
	if listing.Status != "active" {
		return errors.New("挂单已关闭")
	}

	now := time.Now().Unix()

	err = model.DB.Transaction(func(tx *gorm.DB) error {
		// Refund current bidder if auction
		if listing.ListingType == "auction" && listing.CurrentBidderId > 0 && listing.CurrentBid > 0 {
			if err := tx.Model(&model.User{}).Where("id = ?", listing.CurrentBidderId).
				Update("quota", gorm.Expr("quota + ?", listing.CurrentBid)).Error; err != nil {
				return fmt.Errorf("退还竞拍者额度失败: %w", err)
			}
		}

		// Restore pet state
		if err := tx.Model(&model.UserPet{}).Where("id = ?", listing.PetId).
			Updates(map[string]interface{}{
				"state":      "normal",
				"updated_at": now,
			}).Error; err != nil {
			return fmt.Errorf("恢复宠物状态失败: %w", err)
		}

		// Update listing status
		if err := tx.Model(&model.PetMarketListing{}).Where("id = ?", listingId).
			Updates(map[string]interface{}{
				"status":     "cancelled",
				"updated_at": now,
			}).Error; err != nil {
			return fmt.Errorf("更新挂单状态失败: %w", err)
		}

		return nil
	})

	if err != nil {
		return errors.New("取消挂单失败")
	}

	return nil
}

// CompleteExpiredAuctions processes all expired auction listings
func CompleteExpiredAuctions() (int, error) {
	expired, err := model.GetExpiredAuctions()
	if err != nil {
		return 0, err
	}

	completed := 0
	for i := range expired {
		listing := &expired[i]

		txErr := model.DB.Transaction(func(tx *gorm.DB) error {
			if listing.CurrentBidderId > 0 && listing.CurrentBid > 0 {
				// Has bids — complete the sale
				// The bidder's quota was already frozen (deducted) when they placed the bid
				price := listing.CurrentBid
				fee := int(float64(price) * operation_setting.GetMarketFeeRate())
				sellerReceives := price - fee

				// Pay seller
				if err := tx.Model(&model.User{}).Where("id = ?", listing.SellerId).
					Update("quota", gorm.Expr("quota + ?", sellerReceives)).Error; err != nil {
					return err
				}

				// Transfer pet
				if err := tx.Model(&model.UserPet{}).Where("id = ?", listing.PetId).
					Updates(map[string]interface{}{
						"user_id":    listing.CurrentBidderId,
						"state":      "normal",
						"is_primary":  false,
						"updated_at": time.Now().Unix(),
					}).Error; err != nil {
					return err
				}

				listing.Status = "sold"
				listing.UpdatedAt = time.Now().Unix()
				if err := tx.Save(listing).Error; err != nil {
					return err
				}

				// Create transaction
				record := &model.PetMarketTransaction{
					ListingId:   listing.Id,
					SellerId:    listing.SellerId,
					BuyerId:     listing.CurrentBidderId,
					PetId:       listing.PetId,
					Price:       price,
					ListingType: listing.ListingType,
					Fee:         fee,
					CreatedAt:   time.Now().Unix(),
				}
				if err := tx.Create(record).Error; err != nil {
					return err
				}
			} else {
				// No bids — expired without sale, restore pet
				if err := tx.Model(&model.UserPet{}).Where("id = ?", listing.PetId).
					Updates(map[string]interface{}{
						"state":      "normal",
						"updated_at": time.Now().Unix(),
					}).Error; err != nil {
					return err
				}

				listing.Status = "expired"
				listing.UpdatedAt = time.Now().Unix()
				if err := tx.Save(listing).Error; err != nil {
					return err
				}
			}
			return nil
		})

		if txErr == nil {
			completed++
		}
	}

	return completed, nil
}

var lastAuctionCheck time.Time
var auctionCheckMu sync.Mutex

// GetMarketListings retrieves active listings with lazy auction cleanup
func GetMarketListings(page, pageSize int, filters model.MarketFilter) ([]model.PetMarketListing, int64, error) {
	// Throttled cleanup of expired auctions (at most once per 30 seconds)
	auctionCheckMu.Lock()
	if time.Since(lastAuctionCheck) > 30*time.Second {
		lastAuctionCheck = time.Now()
		auctionCheckMu.Unlock()
		_, _ = CompleteExpiredAuctions()
	} else {
		auctionCheckMu.Unlock()
	}

	return model.GetActiveListings(page, pageSize, filters)
}

// ==================== Admin Services ====================

// AdminGetUserPets returns all pets for a given user
func AdminGetUserPets(userId int) ([]model.UserPet, error) {
	return model.GetUserPets(userId)
}

// AdminGrantPet creates a pet and assigns it to a user
func AdminGrantPet(userId, speciesId, level, star int) (*model.UserPet, error) {
	species, err := model.GetSpeciesById(speciesId)
	if err != nil {
		return nil, errors.New("物种不存在")
	}

	if level < 1 {
		level = 1
	}
	if star < 0 {
		star = 0
	}

	// Determine stage based on level
	stage := 0
	if level >= 30 {
		stage = 2
	} else if level >= 10 {
		stage = 1
	}

	pet := &model.UserPet{
		UserId:    userId,
		SpeciesId: speciesId,
		Nickname:  species.Name,
		Level:     level,
		Exp:       0,
		Stage:     stage,
		Star:      star,
		Status:    defaultPetStatus(),
		IsPrimary: false,
		State:     "normal",
	}

	// Compute stats
	recomputeStats(pet, species)

	if err := model.CreateUserPet(pet); err != nil {
		return nil, errors.New("创建宠物失败")
	}

	return pet, nil
}

// AdminGrantItem grants items to a user
func AdminGrantItem(userId, itemId, quantity int) error {
	if quantity <= 0 {
		return errors.New("数量必须大于0")
	}
	// Validate item exists
	_, err := model.GetItemById(itemId)
	if err != nil {
		return errors.New("物品不存在")
	}
	return model.AddUserItem(userId, itemId, quantity)
}

// AdminGetRecentTransactions returns recent market transactions
func AdminGetRecentTransactions(limit int) ([]model.PetMarketTransaction, error) {
	if limit <= 0 {
		limit = 50
	}
	return model.GetRecentTransactions(limit)
}

// PetSystemStats holds aggregated pet system statistics
type PetSystemStats struct {
	TotalPets          int64            `json:"total_pets"`
	TotalUsersWithPets int64            `json:"total_users_with_pets"`
	TotalTransactions  int64            `json:"total_transactions"`
	TotalVolume        int64            `json:"total_volume"`
	RarityDistribution map[string]int64 `json:"rarity_distribution"`
}

// AdminGetPetSystemStats returns aggregate statistics about the pet system
func AdminGetPetSystemStats() (*PetSystemStats, error) {
	stats := &PetSystemStats{
		RarityDistribution: make(map[string]int64),
	}

	// Total pets
	if err := model.DB.Model(&model.UserPet{}).Count(&stats.TotalPets).Error; err != nil {
		return nil, err
	}

	// Total unique users with pets
	var usersResult struct {
		Count int64
	}
	if err := model.DB.Model(&model.UserPet{}).Select("COUNT(DISTINCT user_id) as count").Scan(&usersResult).Error; err != nil {
		return nil, err
	}
	stats.TotalUsersWithPets = usersResult.Count

	// Market stats
	marketStats, err := model.GetMarketStats()
	if err == nil {
		stats.TotalTransactions = marketStats.TotalTransactions
		stats.TotalVolume = marketStats.TotalVolume
	}

	// Rarity distribution (join user_pets with pet_species)
	type rarityCount struct {
		Rarity string `gorm:"column:rarity"`
		Count  int64  `gorm:"column:count"`
	}
	var rarityCounts []rarityCount
	if err := model.DB.Model(&model.UserPet{}).
		Joins("JOIN pet_species ON pet_species.id = user_pets.species_id").
		Select("pet_species.rarity as rarity, COUNT(*) as count").
		Group("pet_species.rarity").
		Find(&rarityCounts).Error; err == nil {
		for _, rc := range rarityCounts {
			stats.RarityDistribution[rc.Rarity] = rc.Count
		}
	}

	// Ensure all rarities have an entry
	for _, r := range []string{"N", "R", "SR", "SSR"} {
		if _, ok := stats.RarityDistribution[r]; !ok {
			stats.RarityDistribution[r] = 0
		}
	}

	return stats, nil
}
