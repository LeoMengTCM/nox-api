package model

import (
	"errors"
	"time"
)

// SocialFollow 关注关系
type SocialFollow struct {
	Id          int   `json:"id" gorm:"primaryKey;autoIncrement"`
	FollowerId  int   `json:"follower_id" gorm:"not null;uniqueIndex:idx_follow_pair"`
	FollowingId int   `json:"following_id" gorm:"not null;uniqueIndex:idx_follow_pair"`
	CreatedAt   int64 `json:"created_at" gorm:"bigint"`
}

func (SocialFollow) TableName() string {
	return "social_follows"
}

// FollowUser 关注用户（禁止自关注）
func FollowUser(followerId, followingId int) error {
	if followerId == followingId {
		return errors.New("不能关注自己")
	}
	follow := &SocialFollow{
		FollowerId:  followerId,
		FollowingId: followingId,
		CreatedAt:   time.Now().Unix(),
	}
	if err := DB.Create(follow).Error; err != nil {
		return err
	}
	// 通知被关注者
	_ = CreateNotificationIfNotExists(followingId, followerId, NotificationTypeFollow, nil)
	return nil
}

// UnfollowUser 取消关注
func UnfollowUser(followerId, followingId int) error {
	result := DB.Where("follower_id = ? AND following_id = ?", followerId, followingId).Delete(&SocialFollow{})
	if result.RowsAffected == 0 {
		return errors.New("未关注该用户")
	}
	return result.Error
}

// IsFollowing 查询是否已关注
func IsFollowing(followerId, followingId int) (bool, error) {
	var count int64
	err := DB.Model(&SocialFollow{}).Where("follower_id = ? AND following_id = ?", followerId, followingId).Count(&count).Error
	return count > 0, err
}

// FollowUserInfo 关注/粉丝列表中的用户信息
type FollowUserInfo struct {
	Id          int    `json:"id"`
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
	AvatarUrl   string `json:"avatar_url"`
	Bio         string `json:"bio"`
}

// GetFollowers 获取粉丝列表（分页）
func GetFollowers(userId int, page, pageSize int) ([]FollowUserInfo, int64, error) {
	var total int64
	err := DB.Model(&SocialFollow{}).Where("following_id = ?", userId).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	var follows []SocialFollow
	err = DB.Where("following_id = ?", userId).Order("created_at DESC").
		Offset((page - 1) * pageSize).Limit(pageSize).Find(&follows).Error
	if err != nil {
		return nil, 0, err
	}

	if len(follows) == 0 {
		return []FollowUserInfo{}, total, nil
	}

	userIds := make([]int, len(follows))
	for i, f := range follows {
		userIds[i] = f.FollowerId
	}

	var users []FollowUserInfo
	DB.Model(&User{}).Select("id, username, display_name, avatar_url, bio").Where("id IN ?", userIds).Find(&users)

	return users, total, nil
}

// GetFollowing 获取关注列表（分页）
func GetFollowing(userId int, page, pageSize int) ([]FollowUserInfo, int64, error) {
	var total int64
	err := DB.Model(&SocialFollow{}).Where("follower_id = ?", userId).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	var follows []SocialFollow
	err = DB.Where("follower_id = ?", userId).Order("created_at DESC").
		Offset((page - 1) * pageSize).Limit(pageSize).Find(&follows).Error
	if err != nil {
		return nil, 0, err
	}

	if len(follows) == 0 {
		return []FollowUserInfo{}, total, nil
	}

	userIds := make([]int, len(follows))
	for i, f := range follows {
		userIds[i] = f.FollowingId
	}

	var users []FollowUserInfo
	DB.Model(&User{}).Select("id, username, display_name, avatar_url, bio").Where("id IN ?", userIds).Find(&users)

	return users, total, nil
}

// FollowCounts 关注计数
type FollowCounts struct {
	Followers int64 `json:"followers"`
	Following int64 `json:"following"`
}

// GetFollowCounts 获取关注/粉丝数量
func GetFollowCounts(userId int) (*FollowCounts, error) {
	counts := &FollowCounts{}
	err := DB.Model(&SocialFollow{}).Where("following_id = ?", userId).Count(&counts.Followers).Error
	if err != nil {
		return nil, err
	}
	err = DB.Model(&SocialFollow{}).Where("follower_id = ?", userId).Count(&counts.Following).Error
	if err != nil {
		return nil, err
	}
	return counts, nil
}
