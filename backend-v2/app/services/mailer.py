def verification_subject() -> str:
    return "你的黑客松登录验证码"


def verification_body(code: str) -> str:
    return f"你的登录验证码是 {code}，10 分钟内有效。"


def checkin_bound_subject() -> str:
    return "CheckinID 绑定成功"


def checkin_bound_body(checkin_id: str) -> str:
    return f"你的 CheckinID {checkin_id} 已绑定成功，后续需求和资源发放都会以此 ID 为准。"


def resource_assigned_subject(pool_name: str) -> str:
    return f"{pool_name} 已发放"


def resource_assigned_body(pool_name: str, code: str) -> str:
    return f"你的 {pool_name} 已发放，兑换码：{code}。请妥善保存，不要转发给他人。"
