package model

import "time"

// SocialBookmark 收藏记录
type SocialBookmark struct {
	Id        int   `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId    int   `json:"user_id" gorm:"not null;uniqueIndex:idx_bookmark_pair;index:idx_bookmark_user"`
	PostId    int   `json:"post_id" gorm:"not null;uniqueIndex:idx_bookmark_pair"`
	CreatedAt int64 `json:"created_at" gorm:"bigint"`
}

func (SocialBookmark) TableName() string {
	return "social_bookmarks"
}

// BookmarkPost 收藏帖子（幂等）
func BookmarkPost(userId, postId int) error {
	bookmark := &SocialBookmark{
		UserId:    userId,
		PostId:    postId,
		CreatedAt: time.Now().Unix(),
	}
	return DB.Where("user_id = ? AND post_id = ?", userId, postId).FirstOrCreate(bookmark).Error
}

// UnbookmarkPost 取消收藏
func UnbookmarkPost(userId, postId int) error {
	return DB.Where("user_id = ? AND post_id = ?", userId, postId).Delete(&SocialBookmark{}).Error
}

// HasBookmarked 是否已收藏
func HasBookmarked(userId, postId int) (bool, error) {
	var count int64
	err := DB.Model(&SocialBookmark{}).Where("user_id = ? AND post_id = ?", userId, postId).Count(&count).Error
	return count > 0, err
}

// GetUserBookmarks 获取用户收藏列表（分页，返回帖子）
func GetUserBookmarks(userId int, page, pageSize int) ([]SocialPost, int64, error) {
	var total int64
	err := DB.Model(&SocialBookmark{}).Where("user_id = ?", userId).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	// 获取收藏的帖子 ID（按收藏时间倒序）
	var bookmarks []SocialBookmark
	err = DB.Where("user_id = ?", userId).Order("created_at DESC").
		Offset((page - 1) * pageSize).Limit(pageSize).Find(&bookmarks).Error
	if err != nil {
		return nil, 0, err
	}

	if len(bookmarks) == 0 {
		return []SocialPost{}, total, nil
	}

	postIds := make([]int, len(bookmarks))
	for i, b := range bookmarks {
		postIds[i] = b.PostId
	}

	// 查询帖子，保持收藏顺序
	var posts []SocialPost
	err = DB.Where("id IN ? AND status = ?", postIds, SocialPostStatusVisible).Find(&posts).Error
	if err != nil {
		return nil, 0, err
	}

	// 按收藏顺序排列
	postMap := make(map[int]SocialPost, len(posts))
	for _, p := range posts {
		postMap[p.Id] = p
	}
	ordered := make([]SocialPost, 0, len(posts))
	for _, id := range postIds {
		if p, ok := postMap[id]; ok {
			ordered = append(ordered, p)
		}
	}

	return ordered, total, nil
}

// BatchGetUserBookmarked 批量判断当前用户是否收藏
func BatchGetUserBookmarked(userId int, postIds []int) (map[int]bool, error) {
	result := make(map[int]bool, len(postIds))
	if len(postIds) == 0 || userId == 0 {
		return result, nil
	}

	var bookmarks []SocialBookmark
	err := DB.Select("post_id").
		Where("user_id = ? AND post_id IN ?", userId, postIds).
		Find(&bookmarks).Error
	if err != nil {
		return result, err
	}
	for _, b := range bookmarks {
		result[b.PostId] = true
	}
	return result, nil
}
