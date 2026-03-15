package model

import (
	"time"
)

// PetMarketListing 市场挂单
type PetMarketListing struct {
	Id               int    `json:"id" gorm:"primaryKey;autoIncrement"`
	SellerId         int    `json:"seller_id" gorm:"not null;index:idx_listing_seller"`
	PetId            int    `json:"pet_id" gorm:"not null"`
	ListingType      string `json:"listing_type" gorm:"type:varchar(16);not null"` // fixed_price, auction
	Price            int    `json:"price" gorm:"default:0"`
	MinBid           int    `json:"min_bid" gorm:"default:0"`
	CurrentBid       int    `json:"current_bid" gorm:"default:0"`
	CurrentBidderId  int    `json:"current_bidder_id" gorm:"default:0"`
	BidCount         int    `json:"bid_count" gorm:"default:0"`
	ExpiresAt        int64  `json:"expires_at" gorm:"bigint"`
	Status           string `json:"status" gorm:"type:varchar(16);default:'active';index:idx_listing_status"` // active, sold, expired, cancelled
	CreatedAt        int64  `json:"created_at" gorm:"bigint"`
	UpdatedAt        int64  `json:"updated_at" gorm:"bigint"`
}

func (PetMarketListing) TableName() string {
	return "pet_market_listings"
}

// PetMarketBid 竞价记录
type PetMarketBid struct {
	Id        int   `json:"id" gorm:"primaryKey;autoIncrement"`
	ListingId int   `json:"listing_id" gorm:"not null;index:idx_bid_listing"`
	BidderId  int   `json:"bidder_id" gorm:"not null;index:idx_bid_bidder"`
	Amount    int   `json:"amount" gorm:"not null"`
	CreatedAt int64 `json:"created_at" gorm:"bigint"`
}

func (PetMarketBid) TableName() string {
	return "pet_market_bids"
}

// PetMarketTransaction 成交记录
type PetMarketTransaction struct {
	Id          int    `json:"id" gorm:"primaryKey;autoIncrement"`
	ListingId   int    `json:"listing_id" gorm:"not null;index:idx_tx_listing"`
	SellerId    int    `json:"seller_id" gorm:"not null;index:idx_tx_seller"`
	BuyerId     int    `json:"buyer_id" gorm:"not null;index:idx_tx_buyer"`
	PetId       int    `json:"pet_id" gorm:"not null"`
	Price       int    `json:"price" gorm:"not null"`
	ListingType string `json:"listing_type" gorm:"type:varchar(16)"`
	Fee         int    `json:"fee" gorm:"default:0"`
	CreatedAt   int64  `json:"created_at" gorm:"bigint"`
}

func (PetMarketTransaction) TableName() string {
	return "pet_market_transactions"
}

// PetPriceHistory 价格历史
type PetPriceHistory struct {
	Id               int    `json:"id" gorm:"primaryKey;autoIncrement"`
	SpeciesId        int    `json:"species_id" gorm:"not null;index:idx_price_species"`
	Rarity           string `json:"rarity" gorm:"type:varchar(8)"`
	Star             int    `json:"star" gorm:"default:0"`
	AvgPrice         int    `json:"avg_price" gorm:"default:0"`
	MinPrice         int    `json:"min_price" gorm:"default:0"`
	MaxPrice         int    `json:"max_price" gorm:"default:0"`
	TransactionCount int    `json:"transaction_count" gorm:"default:0"`
	Period           string `json:"period" gorm:"type:varchar(16)"` // daily, weekly
	Date             string `json:"date" gorm:"type:varchar(16)"`
	CreatedAt        int64  `json:"created_at" gorm:"bigint"`
}

func (PetPriceHistory) TableName() string {
	return "pet_price_histories"
}

// MarketFilter 市场筛选条件
type MarketFilter struct {
	SpeciesId   int
	Rarity      string
	MinStar     int
	MaxStar     int
	ListingType string
	MinPrice    int
	MaxPrice    int
	SortBy      string // price_asc, price_desc, time_desc, rarity
}

// ==================== PetMarketListing CRUD ====================

func CreateListing(listing *PetMarketListing) error {
	listing.CreatedAt = time.Now().Unix()
	listing.UpdatedAt = time.Now().Unix()
	return DB.Create(listing).Error
}

func GetListingById(id int) (*PetMarketListing, error) {
	var listing PetMarketListing
	err := DB.First(&listing, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &listing, nil
}

func UpdateListing(listing *PetMarketListing) error {
	listing.UpdatedAt = time.Now().Unix()
	return DB.Save(listing).Error
}

func GetActiveListings(page, pageSize int, filters MarketFilter) ([]PetMarketListing, int64, error) {
	var listings []PetMarketListing
	var total int64

	q := DB.Model(&PetMarketListing{}).Where("status = ?", "active")

	// Join with user_pets to support species/rarity/star filtering
	needsJoin := filters.SpeciesId > 0 || filters.Rarity != "" || filters.MinStar > 0 || filters.MaxStar > 0
	if needsJoin {
		q = q.Joins("JOIN user_pets ON user_pets.id = pet_market_listings.pet_id")
		if filters.SpeciesId > 0 {
			q = q.Where("user_pets.species_id = ?", filters.SpeciesId)
		}
		if filters.Rarity != "" {
			q = q.Joins("JOIN pet_species ON pet_species.id = user_pets.species_id").
				Where("pet_species.rarity = ?", filters.Rarity)
		}
		if filters.MinStar > 0 {
			q = q.Where("user_pets.star >= ?", filters.MinStar)
		}
		if filters.MaxStar > 0 {
			q = q.Where("user_pets.star <= ?", filters.MaxStar)
		}
	}

	if filters.ListingType != "" {
		q = q.Where("pet_market_listings.listing_type = ?", filters.ListingType)
	}
	if filters.MinPrice > 0 {
		q = q.Where("pet_market_listings.price >= ?", filters.MinPrice)
	}
	if filters.MaxPrice > 0 {
		q = q.Where("pet_market_listings.price <= ?", filters.MaxPrice)
	}

	err := q.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	// Use select to ensure we only get listing columns when joins are present
	selectCols := "pet_market_listings.*"

	switch filters.SortBy {
	case "price_asc":
		q = q.Order("pet_market_listings.price asc")
	case "price_desc":
		q = q.Order("pet_market_listings.price desc")
	case "time_desc":
		q = q.Order("pet_market_listings.id desc")
	default:
		q = q.Order("pet_market_listings.id desc")
	}

	err = q.Select(selectCols).Offset((page - 1) * pageSize).Limit(pageSize).Find(&listings).Error
	return listings, total, err
}

func GetUserListings(userId, page, pageSize int) ([]PetMarketListing, int64, error) {
	var listings []PetMarketListing
	var total int64
	q := DB.Model(&PetMarketListing{}).Where("seller_id = ?", userId)
	err := q.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}
	err = q.Order("id desc").Offset((page - 1) * pageSize).Limit(pageSize).Find(&listings).Error
	return listings, total, err
}

// ==================== PetMarketBid CRUD ====================

func CreateBid(bid *PetMarketBid) error {
	bid.CreatedAt = time.Now().Unix()
	return DB.Create(bid).Error
}

func GetBidsForListing(listingId int) ([]PetMarketBid, error) {
	var bids []PetMarketBid
	err := DB.Where("listing_id = ?", listingId).Order("amount desc").Find(&bids).Error
	return bids, err
}

func GetHighestBid(listingId int) (*PetMarketBid, error) {
	var bid PetMarketBid
	err := DB.Where("listing_id = ?", listingId).Order("amount desc").First(&bid).Error
	if err != nil {
		return nil, err
	}
	return &bid, nil
}

// ==================== PetMarketTransaction CRUD ====================

func CreateTransaction(tx *PetMarketTransaction) error {
	tx.CreatedAt = time.Now().Unix()
	return DB.Create(tx).Error
}

func GetUserTransactions(userId, page, pageSize int) ([]PetMarketTransaction, int64, error) {
	var transactions []PetMarketTransaction
	var total int64
	q := DB.Model(&PetMarketTransaction{}).Where("seller_id = ? OR buyer_id = ?", userId, userId)
	err := q.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}
	err = q.Order("id desc").Offset((page - 1) * pageSize).Limit(pageSize).Find(&transactions).Error
	return transactions, total, err
}

func GetRecentTransactions(limit int) ([]PetMarketTransaction, error) {
	var transactions []PetMarketTransaction
	err := DB.Order("id desc").Limit(limit).Find(&transactions).Error
	return transactions, err
}

// ==================== Auction helpers ====================

func GetExpiredAuctions() ([]PetMarketListing, error) {
	var listings []PetMarketListing
	now := time.Now().Unix()
	err := DB.Where("status = ? AND listing_type = ? AND expires_at <= ?", "active", "auction", now).
		Find(&listings).Error
	return listings, err
}

// ==================== PetPriceHistory CRUD ====================

func CreatePriceHistory(history *PetPriceHistory) error {
	history.CreatedAt = time.Now().Unix()
	return DB.Create(history).Error
}

func GetPriceHistory(speciesId int, limit int) ([]PetPriceHistory, error) {
	var histories []PetPriceHistory
	err := DB.Where("species_id = ?", speciesId).Order("id desc").Limit(limit).Find(&histories).Error
	return histories, err
}

// ==================== Market Stats ====================

type MarketStats struct {
	TotalListings     int64 `json:"total_listings"`
	ActiveListings    int64 `json:"active_listings"`
	TotalTransactions int64 `json:"total_transactions"`
	TotalVolume       int64 `json:"total_volume"`
}

func GetMarketStats() (*MarketStats, error) {
	var stats MarketStats

	if err := DB.Model(&PetMarketListing{}).Count(&stats.TotalListings).Error; err != nil {
		return nil, err
	}
	if err := DB.Model(&PetMarketListing{}).Where("status = ?", "active").Count(&stats.ActiveListings).Error; err != nil {
		return nil, err
	}
	if err := DB.Model(&PetMarketTransaction{}).Count(&stats.TotalTransactions).Error; err != nil {
		return nil, err
	}

	var volumeResult struct {
		Total int64
	}
	if err := DB.Model(&PetMarketTransaction{}).Select("COALESCE(SUM(price), 0) as total").Scan(&volumeResult).Error; err != nil {
		return nil, err
	}
	stats.TotalVolume = volumeResult.Total

	return &stats, nil
}

// GetPetByIdGlobal retrieves a pet by its ID without user ownership check (for market use)
func GetPetByIdGlobal(petId int) (*UserPet, error) {
	var pet UserPet
	err := DB.First(&pet, "id = ?", petId).Error
	if err != nil {
		return nil, err
	}
	return &pet, nil
}
