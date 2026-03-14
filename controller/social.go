package controller

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/LeoMengTCM/nox-api/common"
	"github.com/LeoMengTCM/nox-api/model"
	"github.com/LeoMengTCM/nox-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
)

// ============ Post APIs ============

type CreatePostRequest struct {
	Content string `json:"content"`
}

// CreatePost 创建帖子
func CreatePost(c *gin.Context) {
	setting := operation_setting.GetSocialSetting()
	if !setting.Enabled {
		common.ApiErrorMsg(c, "社区功能未启用")
		return
	}

	var req CreatePostRequest
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}

	content := strings.TrimSpace(req.Content)
	if content == "" {
		common.ApiErrorMsg(c, "帖子内容不能为空")
		return
	}

	// 使用 rune 计算字符数，支持中文
	if len([]rune(content)) > setting.MaxPostLength {
		common.ApiErrorMsg(c, "帖子内容超过最大长度限制")
		return
	}

	userId := c.GetInt("id")
	post, err := model.CreatePost(userId, content)
	if err != nil {
		common.ApiErrorMsg(c, "创建帖子失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    post,
	})
}

// DeletePostByUser 用户删除自己的帖子 (soft delete)
func DeletePostByUser(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的帖子 ID")
		return
	}

	userId := c.GetInt("id")
	if err := model.DeletePost(id, userId); err != nil {
		common.ApiErrorMsg(c, "删除帖子失败，帖子不存在或无权限")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// GetFeed 获取关注时间线
func GetFeed(c *gin.Context) {
	setting := operation_setting.GetSocialSetting()
	if !setting.Enabled {
		common.ApiErrorMsg(c, "社区功能未启用")
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 50 {
		pageSize = 20
	}

	userId := c.GetInt("id")
	posts, total, err := model.GetFeedPosts(userId, page, pageSize)
	if err != nil {
		common.ApiErrorMsg(c, "获取动态失败")
		return
	}

	enriched := model.EnrichPostsWithInteractions(posts, userId)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"items": enriched,
			"total": total,
			"page":  page,
		},
	})
}

// GetSquare 获取广场（全站帖子）
func GetSquare(c *gin.Context) {
	setting := operation_setting.GetSocialSetting()
	if !setting.Enabled {
		common.ApiErrorMsg(c, "社区功能未启用")
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 50 {
		pageSize = 20
	}

	posts, total, err := model.GetSquarePosts(page, pageSize)
	if err != nil {
		common.ApiErrorMsg(c, "获取广场动态失败")
		return
	}

	currentUserId := c.GetInt("id")
	enriched := model.EnrichPostsWithInteractions(posts, currentUserId)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"items": enriched,
			"total": total,
			"page":  page,
		},
	})
}

// ============ Follow APIs ============

// FollowUser 关注用户
func SocialFollowUser(c *gin.Context) {
	targetId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的用户 ID")
		return
	}

	userId := c.GetInt("id")
	if err := model.FollowUser(userId, targetId); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// UnfollowUser 取消关注
func SocialUnfollowUser(c *gin.Context) {
	targetId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的用户 ID")
		return
	}

	userId := c.GetInt("id")
	if err := model.UnfollowUser(userId, targetId); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// GetFollowStatus 查询是否已关注
func GetFollowStatus(c *gin.Context) {
	targetId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的用户 ID")
		return
	}

	userId := c.GetInt("id")
	isFollowing, err := model.IsFollowing(userId, targetId)
	if err != nil {
		common.ApiErrorMsg(c, "查询关注状态失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"is_following": isFollowing,
		},
	})
}

// GetFollowersList 获取粉丝列表
func GetFollowersList(c *gin.Context) {
	targetId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的用户 ID")
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 50 {
		pageSize = 20
	}

	users, total, err := model.GetFollowers(targetId, page, pageSize)
	if err != nil {
		common.ApiErrorMsg(c, "获取粉丝列表失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"items": users,
			"total": total,
			"page":  page,
		},
	})
}

// GetFollowingList 获取关注列表
func GetFollowingList(c *gin.Context) {
	targetId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的用户 ID")
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 50 {
		pageSize = 20
	}

	users, total, err := model.GetFollowing(targetId, page, pageSize)
	if err != nil {
		common.ApiErrorMsg(c, "获取关注列表失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"items": users,
			"total": total,
			"page":  page,
		},
	})
}

// ============ Profile APIs ============

// GetUserProfile 获取用户公开资料 + 社交统计
func GetUserProfile(c *gin.Context) {
	targetId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的用户 ID")
		return
	}

	user, err := model.GetUserById(targetId, false)
	if err != nil {
		common.ApiErrorMsg(c, "用户不存在")
		return
	}

	followCounts, _ := model.GetFollowCounts(targetId)
	postCount, _ := model.GetUserPostCount(targetId)

	// 查询当前用户是否已关注
	currentUserId := c.GetInt("id")
	isFollowing := false
	if currentUserId != targetId {
		isFollowing, _ = model.IsFollowing(currentUserId, targetId)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"id":           user.Id,
			"username":     user.Username,
			"display_name": user.DisplayName,
			"avatar_url":   user.AvatarUrl,
			"bio":          user.Bio,
			"followers":    followCounts.Followers,
			"following":    followCounts.Following,
			"post_count":   postCount,
			"is_following":  isFollowing,
			"is_self":       currentUserId == targetId,
			"used_quota":    user.UsedQuota,
			"request_count": user.RequestCount,
		},
	})
}

// GetUserProfilePosts 获取用户动态时间线
func GetUserProfilePosts(c *gin.Context) {
	targetId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的用户 ID")
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 50 {
		pageSize = 20
	}

	posts, total, err := model.GetUserPosts(targetId, page, pageSize)
	if err != nil {
		common.ApiErrorMsg(c, "获取用户动态失败")
		return
	}

	currentUserId := c.GetInt("id")
	enriched := model.EnrichPostsWithInteractions(posts, currentUserId)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"items": enriched,
			"total": total,
			"page":  page,
		},
	})
}

// ============ Admin APIs ============

// AdminGetSocialPosts 管理员获取帖子列表
func AdminGetSocialPosts(c *gin.Context) {
	status, _ := strconv.Atoi(c.DefaultQuery("status", "0"))
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 50 {
		pageSize = 20
	}

	posts, total, err := model.AdminGetPosts(status, page, pageSize)
	if err != nil {
		common.ApiErrorMsg(c, "获取帖子列表失败")
		return
	}

	enriched := model.EnrichPostsWithAuthors(posts)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"items": enriched,
			"total": total,
			"page":  page,
		},
	})
}

// AdminUpdateSocialPostStatus 管理员修改帖子状态
func AdminUpdateSocialPostStatus(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的帖子 ID")
		return
	}

	var req struct {
		Status int `json:"status"`
	}
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}

	if req.Status != model.SocialPostStatusVisible && req.Status != model.SocialPostStatusHidden {
		common.ApiErrorMsg(c, "无效的状态值")
		return
	}

	if err := model.AdminUpdatePostStatus(id, req.Status); err != nil {
		common.ApiErrorMsg(c, "更新帖子状态失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// AdminDeleteSocialPost 管理员硬删除帖子
func AdminDeleteSocialPost(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的帖子 ID")
		return
	}

	if err := model.AdminDeletePost(id); err != nil {
		common.ApiErrorMsg(c, "删除帖子失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// ============ Like APIs ============

// LikePost 点赞帖子
func LikePost(c *gin.Context) {
	postId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的帖子 ID")
		return
	}

	userId := c.GetInt("id")
	if err := model.LikePost(userId, postId); err != nil {
		common.ApiErrorMsg(c, "点赞失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// UnlikePost 取消点赞
func UnlikePost(c *gin.Context) {
	postId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的帖子 ID")
		return
	}

	userId := c.GetInt("id")
	if err := model.UnlikePost(userId, postId); err != nil {
		common.ApiErrorMsg(c, "取消点赞失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// ============ Comment APIs ============

type CreateCommentRequest struct {
	Content string `json:"content"`
}

// CreateSocialComment 创建评论
func CreateSocialComment(c *gin.Context) {
	postId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的帖子 ID")
		return
	}

	var req CreateCommentRequest
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}

	content := strings.TrimSpace(req.Content)
	if content == "" {
		common.ApiErrorMsg(c, "评论内容不能为空")
		return
	}

	if len([]rune(content)) > 500 {
		common.ApiErrorMsg(c, "评论内容超过最大长度限制")
		return
	}

	userId := c.GetInt("id")
	comment, err := model.CreateComment(userId, postId, content)
	if err != nil {
		common.ApiErrorMsg(c, "创建评论失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    comment,
	})
}

// GetPostComments 获取帖子评论列表
func GetPostComments(c *gin.Context) {
	postId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的帖子 ID")
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 50 {
		pageSize = 20
	}

	comments, total, err := model.GetPostComments(postId, page, pageSize)
	if err != nil {
		common.ApiErrorMsg(c, "获取评论失败")
		return
	}

	enriched := model.EnrichCommentsWithAuthors(comments)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"items": enriched,
			"total": total,
			"page":  page,
		},
	})
}

// DeleteSocialComment 删除自己的评论
func DeleteSocialComment(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的评论 ID")
		return
	}

	userId := c.GetInt("id")
	if err := model.DeleteComment(id, userId); err != nil {
		common.ApiErrorMsg(c, "删除评论失败，评论不存在或无权限")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// ============ Bookmark APIs ============

// BookmarkPost 收藏帖子
func BookmarkPost(c *gin.Context) {
	postId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的帖子 ID")
		return
	}

	userId := c.GetInt("id")
	if err := model.BookmarkPost(userId, postId); err != nil {
		common.ApiErrorMsg(c, "收藏失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// UnbookmarkPost 取消收藏
func UnbookmarkPost(c *gin.Context) {
	postId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的帖子 ID")
		return
	}

	userId := c.GetInt("id")
	if err := model.UnbookmarkPost(userId, postId); err != nil {
		common.ApiErrorMsg(c, "取消收藏失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// GetBookmarks 获取我的收藏列表
func GetBookmarks(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 50 {
		pageSize = 20
	}

	userId := c.GetInt("id")
	posts, total, err := model.GetUserBookmarks(userId, page, pageSize)
	if err != nil {
		common.ApiErrorMsg(c, "获取收藏列表失败")
		return
	}

	enriched := model.EnrichPostsWithInteractions(posts, userId)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"items": enriched,
			"total": total,
			"page":  page,
		},
	})
}

// ============ Admin Comment APIs ============

// AdminDeleteSocialComment 管理员硬删除评论
func AdminDeleteSocialComment(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的评论 ID")
		return
	}

	if err := model.AdminDeleteComment(id); err != nil {
		common.ApiErrorMsg(c, "删除评论失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// AdminUpdateSocialCommentStatus 管理员隐藏/显示评论
func AdminUpdateSocialCommentStatus(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的评论 ID")
		return
	}

	var req struct {
		Status int `json:"status"`
	}
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}

	if req.Status != model.SocialCommentStatusVisible && req.Status != model.SocialCommentStatusHidden {
		common.ApiErrorMsg(c, "无效的状态值")
		return
	}

	if err := model.AdminUpdateCommentStatus(id, req.Status); err != nil {
		common.ApiErrorMsg(c, "更新评论状态失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// ============ Repost APIs ============

type CreateRepostRequest struct {
	OriginalPostId int    `json:"original_post_id"`
	Content        string `json:"content"`
}

// CreateRepost 引用转发
func CreateRepost(c *gin.Context) {
	setting := operation_setting.GetSocialSetting()
	if !setting.Enabled {
		common.ApiErrorMsg(c, "社区功能未启用")
		return
	}

	var req CreateRepostRequest
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "无效的请求参数")
		return
	}

	if req.OriginalPostId <= 0 {
		common.ApiErrorMsg(c, "无效的帖子 ID")
		return
	}

	content := strings.TrimSpace(req.Content)
	// 转发评论可以为空（纯转发），但有上限
	if len([]rune(content)) > setting.MaxPostLength {
		common.ApiErrorMsg(c, "帖子内容超过最大长度限制")
		return
	}

	userId := c.GetInt("id")
	post, err := model.CreateRepost(userId, req.OriginalPostId, content)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    post,
	})
}

// ============ Notification APIs ============

// GetNotifications 获取通知列表
func GetNotifications(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 50 {
		pageSize = 20
	}

	userId := c.GetInt("id")
	notifications, total, err := model.GetNotifications(userId, page, pageSize)
	if err != nil {
		common.ApiErrorMsg(c, "获取通知失败")
		return
	}

	enriched := model.EnrichNotificationsWithActors(notifications)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"items": enriched,
			"total": total,
			"page":  page,
		},
	})
}

// GetUnreadNotificationCount 获取未读通知数量
func GetUnreadNotificationCount(c *gin.Context) {
	userId := c.GetInt("id")
	count, err := model.GetUnreadNotificationCount(userId)
	if err != nil {
		common.ApiErrorMsg(c, "获取未读通知数量失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"count": count,
		},
	})
}

// MarkAllNotificationsRead 标记全部通知已读
func MarkAllNotificationsRead(c *gin.Context) {
	userId := c.GetInt("id")
	if err := model.MarkAllNotificationsRead(userId); err != nil {
		common.ApiErrorMsg(c, "操作失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// MarkNotificationRead 标记单条通知已读
func MarkNotificationRead(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的通知 ID")
		return
	}

	userId := c.GetInt("id")
	if err := model.MarkNotificationRead(id, userId); err != nil {
		common.ApiErrorMsg(c, "操作失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}
