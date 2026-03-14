package model

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

const (
	SocialPostStatusVisible = 1
	SocialPostStatusHidden  = 2
)

// SocialPost 社区帖子
type SocialPost struct {
	Id        int            `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId    int            `json:"user_id" gorm:"not null;index:idx_social_post_user"`
	Content   string         `json:"content" gorm:"type:text;not null"`
	RepostId  *int           `json:"repost_id,omitempty" gorm:"index:idx_social_post_repost"`
	Status    int            `json:"status" gorm:"type:int;default:1;index:idx_social_post_status"` // 1=visible, 2=hidden
	CreatedAt int64          `json:"created_at" gorm:"bigint;index:idx_social_post_created"`
	UpdatedAt int64          `json:"updated_at" gorm:"bigint"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

func (SocialPost) TableName() string {
	return "social_posts"
}

// PostAuthor 帖子作者信息（用于批量加载，避免 N+1 查询）
type PostAuthor struct {
	Id          int    `json:"id"`
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
	AvatarUrl   string `json:"avatar_url"`
}

// PostWithAuthor 帖子 + 作者信息 + 互动数据
type PostWithAuthor struct {
	SocialPost
	Author         PostAuthor      `json:"author" gorm:"-"`
	LikeCount      int64           `json:"like_count" gorm:"-"`
	CommentCount   int64           `json:"comment_count" gorm:"-"`
	RepostCount    int64           `json:"repost_count" gorm:"-"`
	Liked          bool            `json:"liked" gorm:"-"`
	Bookmarked     bool            `json:"bookmarked" gorm:"-"`
	RepostOriginal *PostWithAuthor `json:"repost_original,omitempty" gorm:"-"`
}

// CreatePost 创建帖子
func CreatePost(userId int, content string) (*SocialPost, error) {
	now := time.Now().Unix()
	post := &SocialPost{
		UserId:    userId,
		Content:   content,
		Status:    SocialPostStatusVisible,
		CreatedAt: now,
		UpdatedAt: now,
	}
	err := DB.Create(post).Error
	return post, err
}

// GetPostById 根据 ID 获取帖子
func GetPostById(id int) (*SocialPost, error) {
	var post SocialPost
	err := DB.First(&post, "id = ?", id).Error
	return &post, err
}

// DeletePost soft delete 帖子（仅帖子作者可调用）
func DeletePost(id int, userId int) error {
	result := DB.Where("id = ? AND user_id = ?", id, userId).Delete(&SocialPost{})
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return result.Error
}

// GetUserPosts 获取用户的帖子（分页，仅 visible）
func GetUserPosts(userId int, page, pageSize int) ([]SocialPost, int64, error) {
	var posts []SocialPost
	var total int64

	query := DB.Model(&SocialPost{}).Where("user_id = ? AND status = ?", userId, SocialPostStatusVisible)
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := query.Order("created_at DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&posts).Error
	return posts, total, err
}

// GetFeedPosts 获取关注时间线（关注者的帖子，分页）
func GetFeedPosts(userId int, page, pageSize int) ([]SocialPost, int64, error) {
	var posts []SocialPost
	var total int64

	subQuery := DB.Model(&SocialFollow{}).Select("following_id").Where("follower_id = ?", userId)
	query := DB.Model(&SocialPost{}).Where("user_id IN (?) AND status = ?", subQuery, SocialPostStatusVisible)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := query.Order("created_at DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&posts).Error
	return posts, total, err
}

// GetSquarePosts 获取广场帖子（全站，分页）
func GetSquarePosts(page, pageSize int) ([]SocialPost, int64, error) {
	var posts []SocialPost
	var total int64

	query := DB.Model(&SocialPost{}).Where("status = ?", SocialPostStatusVisible)
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := query.Order("created_at DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&posts).Error
	return posts, total, err
}

// GetUserPostCount 获取用户帖子数量
func GetUserPostCount(userId int) (int64, error) {
	var count int64
	err := DB.Model(&SocialPost{}).Where("user_id = ? AND status = ?", userId, SocialPostStatusVisible).Count(&count).Error
	return count, err
}

// AdminGetPosts 管理员获取帖子列表（分页，可按状态筛选）
func AdminGetPosts(status int, page, pageSize int) ([]SocialPost, int64, error) {
	var posts []SocialPost
	var total int64

	query := DB.Model(&SocialPost{})
	if status > 0 {
		query = query.Where("status = ?", status)
	}
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := query.Order("created_at DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&posts).Error
	return posts, total, err
}

// AdminUpdatePostStatus 管理员修改帖子状态
func AdminUpdatePostStatus(id int, status int) error {
	return DB.Model(&SocialPost{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":     status,
		"updated_at": time.Now().Unix(),
	}).Error
}

// AdminDeletePost 管理员硬删除帖子
func AdminDeletePost(id int) error {
	return DB.Unscoped().Delete(&SocialPost{}, "id = ?", id).Error
}

// CreateRepost 创建引用转发
func CreateRepost(userId, originalPostId int, content string) (*SocialPost, error) {
	// 查询原帖
	var original SocialPost
	if err := DB.First(&original, "id = ?", originalPostId).Error; err != nil {
		return nil, errors.New("原帖不存在")
	}

	// 禁止转发自己的帖子
	if original.UserId == userId {
		return nil, errors.New("不能转发自己的帖子")
	}

	// 链式转发防护：如果原帖本身是转发，取其 RepostId 作为真正原帖
	repostId := originalPostId
	if original.RepostId != nil {
		repostId = *original.RepostId
	}

	now := time.Now().Unix()
	post := &SocialPost{
		UserId:    userId,
		Content:   content,
		RepostId:  &repostId,
		Status:    SocialPostStatusVisible,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := DB.Create(post).Error; err != nil {
		return nil, err
	}

	// 通知原帖作者
	// 查询真正原帖的作者
	var realOriginal SocialPost
	if err := DB.Select("user_id").First(&realOriginal, "id = ?", repostId).Error; err == nil {
		_ = CreateNotification(realOriginal.UserId, userId, NotificationTypeRepost, &repostId, nil)
	}

	return post, nil
}

// BatchGetRepostCounts 批量获取转发数
func BatchGetRepostCounts(postIds []int) (map[int]int64, error) {
	result := make(map[int]int64, len(postIds))
	if len(postIds) == 0 {
		return result, nil
	}

	type countRow struct {
		RepostId int
		Count    int64
	}
	var rows []countRow
	err := DB.Model(&SocialPost{}).
		Select("repost_id, COUNT(*) as count").
		Where("repost_id IN ? AND deleted_at IS NULL AND status = ?", postIds, SocialPostStatusVisible).
		Group("repost_id").
		Find(&rows).Error
	if err != nil {
		return result, err
	}
	for _, r := range rows {
		result[r.RepostId] = r.Count
	}
	return result, nil
}

// EnrichPostsWithAuthors 批量加载帖子作者信息
func EnrichPostsWithAuthors(posts []SocialPost) []PostWithAuthor {
	if len(posts) == 0 {
		return nil
	}

	// 收集所有用户 ID
	userIdSet := make(map[int]struct{})
	for _, p := range posts {
		userIdSet[p.UserId] = struct{}{}
	}
	userIds := make([]int, 0, len(userIdSet))
	for id := range userIdSet {
		userIds = append(userIds, id)
	}

	// 批量查询用户信息
	var users []struct {
		Id          int
		Username    string
		DisplayName string
		AvatarUrl   string
	}
	DB.Model(&User{}).Select("id, username, display_name, avatar_url").Where("id IN ?", userIds).Find(&users)

	userMap := make(map[int]PostAuthor, len(users))
	for _, u := range users {
		userMap[u.Id] = PostAuthor{
			Id:          u.Id,
			Username:    u.Username,
			DisplayName: u.DisplayName,
			AvatarUrl:   u.AvatarUrl,
		}
	}

	// 组装结果
	result := make([]PostWithAuthor, len(posts))
	for i, p := range posts {
		result[i] = PostWithAuthor{
			SocialPost: p,
			Author:     userMap[p.UserId],
		}
	}
	return result
}

// EnrichPostsWithInteractions 批量加载帖子的作者 + 互动数据（点赞/评论/收藏）
func EnrichPostsWithInteractions(posts []SocialPost, currentUserId int) []PostWithAuthor {
	if len(posts) == 0 {
		return nil
	}

	// 先加载作者信息
	result := EnrichPostsWithAuthors(posts)

	// 收集帖子 ID
	postIds := make([]int, len(posts))
	for i, p := range posts {
		postIds[i] = p.Id
	}

	// 批量查询点赞数
	likeCounts, _ := BatchGetLikeCounts(postIds)
	// 批量查询评论数
	commentCounts, _ := BatchGetCommentCounts(postIds)
	// 批量查询转发数
	repostCounts, _ := BatchGetRepostCounts(postIds)
	// 批量查询当前用户是否点赞
	userLiked, _ := BatchGetUserLiked(currentUserId, postIds)
	// 批量查询当前用户是否收藏
	userBookmarked, _ := BatchGetUserBookmarked(currentUserId, postIds)

	// 合并互动数据
	for i := range result {
		pid := result[i].Id
		result[i].LikeCount = likeCounts[pid]
		result[i].CommentCount = commentCounts[pid]
		result[i].RepostCount = repostCounts[pid]
		result[i].Liked = userLiked[pid]
		result[i].Bookmarked = userBookmarked[pid]
	}

	// 加载转发原帖
	repostIdSet := make(map[int]struct{})
	for _, r := range result {
		if r.RepostId != nil {
			repostIdSet[*r.RepostId] = struct{}{}
		}
	}
	if len(repostIdSet) > 0 {
		repostIds := make([]int, 0, len(repostIdSet))
		for id := range repostIdSet {
			repostIds = append(repostIds, id)
		}
		var originalPosts []SocialPost
		DB.Where("id IN ?", repostIds).Find(&originalPosts)

		originalEnriched := EnrichPostsWithAuthors(originalPosts)
		originalMap := make(map[int]*PostWithAuthor, len(originalEnriched))
		for i := range originalEnriched {
			originalMap[originalEnriched[i].Id] = &originalEnriched[i]
		}

		for i := range result {
			if result[i].RepostId != nil {
				if orig, ok := originalMap[*result[i].RepostId]; ok {
					result[i].RepostOriginal = orig
				}
			}
		}
	}

	return result
}
