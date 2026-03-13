package service

import (
	"github.com/LeoMengTCM/nox-api/setting/operation_setting"
	"github.com/LeoMengTCM/nox-api/setting/system_setting"
)

func GetCallbackAddress() string {
	if operation_setting.CustomCallbackAddress == "" {
		return system_setting.ServerAddress
	}
	return operation_setting.CustomCallbackAddress
}
