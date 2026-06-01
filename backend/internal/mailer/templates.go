package mailer

import "fmt"

func VerificationSubject() string {
	return "你的黑客松登录验证码"
}

func VerificationBody(code string) string {
	return fmt.Sprintf("你的登录验证码是 %s，10 分钟内有效。", code)
}

func CheckinBoundSubject() string {
	return "CheckinID 绑定成功"
}

func CheckinBoundBody(checkinID string) string {
	return fmt.Sprintf("你的 CheckinID %s 已绑定成功，后续需求和资源发放都会以此 ID 为准。", checkinID)
}

func ResourceAssignedSubject(poolName string) string {
	return fmt.Sprintf("%s 已发放", poolName)
}

func ResourceAssignedBody(poolName, code string) string {
	return fmt.Sprintf("你的 %s 已发放，兑换码：%s。请妥善保存，不要转发给他人。", poolName, code)
}
