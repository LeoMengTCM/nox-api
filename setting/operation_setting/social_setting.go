package operation_setting

import "github.com/LeoMengTCM/nox-api/setting/config"

// SocialSetting 社区功能配置
type SocialSetting struct {
	Enabled       bool `json:"enabled"`         // 是否启用社区功能
	MaxPostLength int  `json:"max_post_length"` // 帖子最大字数
}

// 默认配置
var socialSetting = SocialSetting{
	Enabled:       false, // 默认关闭
	MaxPostLength: 500,   // 默认最大500字
}

func init() {
	// 注册到全局配置管理器
	config.GlobalConfig.Register("social_setting", &socialSetting)
}

// GetSocialSetting 获取社区配置
func GetSocialSetting() *SocialSetting {
	return &socialSetting
}

// IsSocialEnabled 是否启用社区功能
func IsSocialEnabled() bool {
	return socialSetting.Enabled
}

// GetMaxPostLength 获取帖子最大字数
func GetMaxPostLength() int {
	return socialSetting.MaxPostLength
}
