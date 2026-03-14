package model

import (
	"time"

	"gorm.io/gorm"
)

const (
	SocialCommentStatusVisible = 1
	SocialCommentStatusHidden  = 2
)

// SocialComment 社区评论
type SocialComment struct {
	Id        int            `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId    int            `json:"user_id" gorm:"not null;index:idx_comment_user"`
	PostId    int            `json:"post_id" gorm:"not null;index:idx_comment_post"`
	Content   string         `json:"content" gorm:"type:text;not null"`
	Status    int            `json:"status" gorm:"type:int;default:1"` // 1=visible, 2=hidden
	CreatedAt int64          `json:"created_at" gorm:"bigint"`
	UpdatedAt int64          `json:"updated_at" gorm:"bigint"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

func (SocialComment) TableName() string {
	return "social_comments"
}

// CommentAuthor 评论作者信息
type CommentAuthor struct {
	Id          int    `json:"id"`
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
	AvatarUrl   string `json:"avatar_url"`
}

// CommentWithAuthor 评论 + 作者信息
type CommentWithAuthor struct {
	SocialComment
	Author CommentAuthor `json:"author" gorm:"-"`
}

// CreateComment 创建评论
func CreateComment(userId, postId int, content string) (*SocialComment, error) {
	now := time.Now().Unix()
	comment := &SocialComment{
		UserId:    userId,
		PostId:    postId,
		Content:   content,
		Status:    SocialCommentStatusVisible,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := DB.Create(comment).Error; err != nil {
		return nil, err
	}
	// 查询帖子作者并发通知（每条评论都通知，不去重）
	var post SocialPost
	if err := DB.Select("user_id").First(&post, "id = ?", postId).Error; err == nil {
		_ = CreateNotification(post.UserId, userId, NotificationTypeComment, &postId, &comment.Id)
	}
	return comment, nil
}

// DeleteComment 作者 soft delete 自己的评论
func DeleteComment(id int, userId int) error {
	result := DB.Where("id = ? AND user_id = ?", id, userId).Delete(&SocialComment{})
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return result.Error
}

// GetPostComments 获取帖子评论列表（分页，仅 visible）
func GetPostComments(postId int, page, pageSize int) ([]SocialComment, int64, error) {
	var comments []SocialComment
	var total int64

	query := DB.Model(&SocialComment{}).Where("post_id = ? AND status = ?", postId, SocialCommentStatusVisible)
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := query.Order("created_at ASC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&comments).Error
	return comments, total, err
}

// GetPostCommentCount 获取单帖评论数
func GetPostCommentCount(postId int) (int64, error) {
	var count int64
	err := DB.Model(&SocialComment{}).Where("post_id = ? AND status = ?", postId, SocialCommentStatusVisible).Count(&count).Error
	return count, err
}

// BatchGetCommentCounts 批量获取评论数
func BatchGetCommentCounts(postIds []int) (map[int]int64, error) {
	result := make(map[int]int64, len(postIds))
	if len(postIds) == 0 {
		return result, nil
	}

	type countRow struct {
		PostId int
		Count  int64
	}
	var rows []countRow
	err := DB.Model(&SocialComment{}).
		Select("post_id, COUNT(*) as count").
		Where("post_id IN ? AND status = ?", postIds, SocialCommentStatusVisible).
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

// EnrichCommentsWithAuthors 批量加载评论作者信息
func EnrichCommentsWithAuthors(comments []SocialComment) []CommentWithAuthor {
	if len(comments) == 0 {
		return nil
	}

	userIdSet := make(map[int]struct{})
	for _, c := range comments {
		userIdSet[c.UserId] = struct{}{}
	}
	userIds := make([]int, 0, len(userIdSet))
	for id := range userIdSet {
		userIds = append(userIds, id)
	}

	var users []struct {
		Id          int
		Username    string
		DisplayName string
		AvatarUrl   string
	}
	DB.Model(&User{}).Select("id, username, display_name, avatar_url").Where("id IN ?", userIds).Find(&users)

	userMap := make(map[int]CommentAuthor, len(users))
	for _, u := range users {
		userMap[u.Id] = CommentAuthor{
			Id:          u.Id,
			Username:    u.Username,
			DisplayName: u.DisplayName,
			AvatarUrl:   u.AvatarUrl,
		}
	}

	result := make([]CommentWithAuthor, len(comments))
	for i, c := range comments {
		result[i] = CommentWithAuthor{
			SocialComment: c,
			Author:        userMap[c.UserId],
		}
	}
	return result
}

// AdminDeleteComment 管理员硬删除评论
func AdminDeleteComment(id int) error {
	return DB.Unscoped().Delete(&SocialComment{}, "id = ?", id).Error
}

// AdminUpdateCommentStatus 管理员隐藏/显示评论
func AdminUpdateCommentStatus(id int, status int) error {
	return DB.Model(&SocialComment{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":     status,
		"updated_at": time.Now().Unix(),
	}).Error
}
