from datetime import UTC, datetime

from app.schemas import FeatureLink

FEATURE_MODULES: list[FeatureLink] = [
    # 入口
    FeatureLink(
        id="feat_dashboard",
        title="总览",
        description="选手服务系统总览",
        url="/p/dashboard",
        enabled=True,
        sortOrder=1100,
    ),
    FeatureLink(
        id="feat_countdown",
        title="倒计时",
        description="比赛倒计时",
        url="/p/dashboard",
        enabled=True,
        sortOrder=1200,
    ),
    # 报名阶段
    FeatureLink(
        id="feat_enrollment",
        title="报名",
        description="提交参赛报名信息",
        url="/p/enrollment",
        enabled=True,
        sortOrder=1300,
    ),
    FeatureLink(
        id="feat_profile",
        title="我的资料",
        description="补全赛前信息和联系方式",
        url="/p/profile",
        enabled=True,
        sortOrder=1400,
    ),
    # 赛前收集
    FeatureLink(
        id="feat_accommodation",
        title="住宿需求",
        description="填写你的住宿偏好和需求",
        url="/p/accommodation",
        enabled=True,
        sortOrder=1500,
    ),
    FeatureLink(
        id="feat_identity",
        title="签到身份",
        description="现场绑定 CheckinID",
        url="/p/identity",
        enabled=True,
        sortOrder=1600,
    ),
    FeatureLink(
        id="feat_meal_order",
        title="餐饮补给",
        description="提交餐食忌口和饮料补给需求",
        url="/p/meal-order",
        enabled=True,
        sortOrder=1700,
    ),
    # 赛事运营
    FeatureLink(
        id="feat_resources",
        title="我的资源",
        description="查看已领取的兑换码和物资",
        url="/p/resources",
        enabled=True,
        sortOrder=1800,
    ),
    FeatureLink(
        id="feat_location",
        title="赛事地点",
        description="查看比赛场地位置和交通",
        url="/p/location",
        enabled=True,
        sortOrder=1900,
    ),
]

_feature_enabled: dict[str, bool] = {m.id: m.enabled for m in FEATURE_MODULES}


def get_feature_links() -> list[FeatureLink]:
    now = datetime.now(UTC)
    return [
        m.model_copy(update={"enabled": _feature_enabled.get(m.id, m.enabled), "updatedAt": now})
        for m in FEATURE_MODULES
        if _feature_enabled.get(m.id, m.enabled)
    ]


def get_all_feature_links() -> list[FeatureLink]:
    now = datetime.now(UTC)
    return [
        m.model_copy(update={"enabled": _feature_enabled.get(m.id, m.enabled), "updatedAt": now})
        for m in FEATURE_MODULES
    ]


def toggle_feature(feature_id: str, enabled: bool) -> FeatureLink:
    if feature_id not in {m.id for m in FEATURE_MODULES}:
        raise ValueError(f"feature module not found: {feature_id}")
    _feature_enabled[feature_id] = enabled
    now = datetime.now(UTC)
    for m in FEATURE_MODULES:
        if m.id == feature_id:
            return m.model_copy(update={"enabled": enabled, "updatedAt": now})
    raise ValueError(f"feature module not found: {feature_id}")
