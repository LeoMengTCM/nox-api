package model

import "time"

// SocialLike 点赞记录
type SocialLike struct {
	Id        int   `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId    int   `json:"user_id" gorm:"not null;uniqueIndex:idx_like_pair"`
	PostId    int   `json:"post_id" gorm:"not null;uniqueIndex:idx_like_pair;index:idx_like_post"`
	CreatedAt int64 `json:"created_at" gorm:"bigint"`
}

func (SocialLike) TableName() string {
	return "social_likes"
}

// LikePost 点赞帖子（幂等，已点赞则忽略）
func LikePost(userId, postId int) error {
	like := &SocialLike{
		UserId:    userId,
		PostId:    postId,
		CreatedAt: time.Now().Unix(),
	}
	// 使用 First 检查是否已存在
	var existing SocialLike
	err := DB.Where("user_id = ? AND post_id = ?", userId, postId).First(&existing).Error
	if err == nil {
		// 已存在，幂等返回
		return nil
	}
	// 创建新记录
	if err := DB.Create(like).Error; err != nil {
		return err
	}
	// 查询帖子作者并发通知
	var post SocialPost
	if err := DB.Select("user_id").First(&post, "id = ?", postId).Error; err == nil {
		_ = CreateNotificationIfNotExists(post.UserId, userId, NotificationTypeLike, &postId)
	}
	return nil
}

// UnlikePost 取消点赞
func UnlikePost(userId, postId int) error {
	return DB.Where("user_id = ? AND post_id = ?", userId, postId).Delete(&SocialLike{}).Error
}

// HasLiked 是否已点赞
func HasLiked(userId, postId int) (bool, error) {
	var count int64
	err := DB.Model(&SocialLike{}).Where("user_id = ? AND post_id = ?", userId, postId).Count(&count).Error
	return count > 0, err
}

// GetPostLikeCount 获取单帖点赞数
func GetPostLikeCount(postId int) (int64, error) {
	var count int64
	err := DB.Model(&SocialLike{}).Where("post_id = ?", postId).Count(&count).Error
	return count, err
}

// BatchGetLikeCounts 批量获取点赞数
func BatchGetLikeCounts(postIds []int) (map[int]int64, error) {
	result := make(map[int]int64, len(postIds))
	if len(postIds) == 0 {
		return result, nil
	}

	type countRow struct {
		PostId int
		Count  int64
	}
	var rows []countRow
	err := DB.Model(&SocialLike{}).
		Select("post_id, COUNT(*) as count").
		Where("post_id IN ?", postIds).
		Group("post_id").
		Find(&rows).Error
	if err != nil {
		return result, err
	}
	for _, r := range rows {
		result[r.PostId] = r.Count
	}
	return result, nil
}

// BatchGetUserLiked 批量判断当前用户是否点赞
func BatchGetUserLiked(userId int, postIds []int) (map[int]bool, error) {
	result := make(map[int]bool, len(postIds))
	if len(postIds) == 0 || userId == 0 {
		return result, nil
	}

	var likes []SocialLike
	err := DB.Select("post_id").
		Where("user_id = ? AND post_id IN ?", userId, postIds).
		Find(&likes).Error
	if err != nil {
		return result, err
	}
	for _, l := range likes {
		result[l.PostId] = true
	}
	return result, nil
}
