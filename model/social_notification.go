package model

import "time"

const (
	NotificationTypeLike    = "like"
	NotificationTypeComment = "comment"
	NotificationTypeFollow  = "follow"
	NotificationTypeRepost  = "repost"
)

// SocialNotification 社区通知
type SocialNotification struct {
	Id        int    `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId    int    `json:"user_id" gorm:"not null;index:idx_notif_user_read"`
	ActorId   int    `json:"actor_id" gorm:"not null"`
	Type      string `json:"type" gorm:"type:varchar(16);not null"`
	PostId    *int   `json:"post_id,omitempty" gorm:"index:idx_notif_post"`
	CommentId *int   `json:"comment_id,omitempty"`
	IsRead    bool   `json:"is_read" gorm:"default:false;index:idx_notif_user_read"`
	CreatedAt int64  `json:"created_at" gorm:"bigint"`
}

func (SocialNotification) TableName() string {
	return "social_notifications"
}

// NotificationWithActor 通知 + 触发者信息
type NotificationWithActor struct {
	SocialNotification
	Actor       PostAuthor `json:"actor" gorm:"-"`
	PostContent *string    `json:"post_content,omitempty" gorm:"-"`
}

// CreateNotification 创建通知（自己触发自己的不创建）
func CreateNotification(userId, actorId int, notifType string, postId *int, commentId *int) error {
	if userId == actorId {
		return nil
	}
	notif := &SocialNotification{
		UserId:    userId,
		ActorId:   actorId,
		Type:      notifType,
		PostId:    postId,
		CommentId: commentId,
		CreatedAt: time.Now().Unix(),
	}
	return DB.Create(notif).Error
}

// CreateNotificationIfNotExists 去重版创建通知（用于点赞/关注，取消后再触发不重复通知）
func CreateNotificationIfNotExists(userId, actorId int, notifType string, postId *int) error {
	if userId == actorId {
		return nil
	}
	notif := &SocialNotification{
		UserId:    userId,
		ActorId:   actorId,
		Type:      notifType,
		PostId:    postId,
		CreatedAt: time.Now().Unix(),
	}
	query := DB.Where("user_id = ? AND actor_id = ? AND type = ?", userId, actorId, notifType)
	if postId != nil {
		query = query.Where("post_id = ?", *postId)
	} else {
		query = query.Where("post_id IS NULL")
	}
	return query.FirstOrCreate(notif).Error
}

// GetNotifications 获取通知列表（分页）
func GetNotifications(userId int, page, pageSize int) ([]SocialNotification, int64, error) {
	var notifications []SocialNotification
	var total int64

	query := DB.Model(&SocialNotification{}).Where("user_id = ?", userId)
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := query.Order("created_at DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&notifications).Error
	return notifications, total, err
}

// GetUnreadNotificationCount 获取未读通知数量
func GetUnreadNotificationCount(userId int) (int64, error) {
	var count int64
	err := DB.Model(&SocialNotification{}).Where("user_id = ? AND is_read = ?", userId, false).Count(&count).Error
	return count, err
}

// MarkAllNotificationsRead 标记全部通知已读
func MarkAllNotificationsRead(userId int) error {
	return DB.Model(&SocialNotification{}).
		Where("user_id = ? AND is_read = ?", userId, false).
		Update("is_read", true).Error
}

// MarkNotificationRead 标记单条通知已读
func MarkNotificationRead(id int, userId int) error {
	return DB.Model(&SocialNotification{}).
		Where("id = ? AND user_id = ?", id, userId).
		Update("is_read", true).Error
}

// EnrichNotificationsWithActors 批量加载触发者信息 + 帖子内容预览
func EnrichNotificationsWithActors(notifications []SocialNotification) []NotificationWithActor {
	if len(notifications) == 0 {
		return nil
	}

	// 收集 actor IDs
	actorIdSet := make(map[int]struct{})
	for _, n := range notifications {
		actorIdSet[n.ActorId] = struct{}{}
	}
	actorIds := make([]int, 0, len(actorIdSet))
	for id := range actorIdSet {
		actorIds = append(actorIds, id)
	}

	// 批量查询 actor 信息
	var users []struct {
		Id          int
		Username    string
		DisplayName string
		AvatarUrl   string
	}
	DB.Model(&User{}).Select("id, username, display_name, avatar_url").Where("id IN ?", actorIds).Find(&users)

	actorMap := make(map[int]PostAuthor, len(users))
	for _, u := range users {
		actorMap[u.Id] = PostAuthor{
			Id:          u.Id,
			Username:    u.Username,
			DisplayName: u.DisplayName,
			AvatarUrl:   u.AvatarUrl,
		}
	}

	// 收集 post IDs 用于内容预览
	postIdSet := make(map[int]struct{})
	for _, n := range notifications {
		if n.PostId != nil {
			postIdSet[*n.PostId] = struct{}{}
		}
	}
	postContentMap := make(map[int]string)
	if len(postIdSet) > 0 {
		postIds := make([]int, 0, len(postIdSet))
		for id := range postIdSet {
			postIds = append(postIds, id)
		}
		var posts []SocialPost
		DB.Select("id, content").Where("id IN ?", postIds).Find(&posts)
		for _, p := range posts {
			content := []rune(p.Content)
			if len(content) > 100 {
				content = content[:100]
			}
			postContentMap[p.Id] = string(content)
		}
	}

	// 组装结果
	result := make([]NotificationWithActor, len(notifications))
	for i, n := range notifications {
		result[i] = NotificationWithActor{
			SocialNotification: n,
			Actor:              actorMap[n.ActorId],
		}
		if n.PostId != nil {
			if content, ok := postContentMap[*n.PostId]; ok {
				result[i].PostContent = &content
			}
		}
	}
	return result
}
