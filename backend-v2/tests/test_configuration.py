from fastapi.testclient import TestClient


def test_public_seeded_feature_links_and_health(client: TestClient):
    assert client.get("/api/health").json() == {"status": "ok"}
    features = client.get("/api/feature-links").json()
    links = client.get("/api/navigation-links").json()

    feature_urls = [link["url"] for link in features]
    assert "/p/enrollment" in feature_urls
    assert "/p/profile" in feature_urls
    assert "/p/accommodation" in feature_urls
    assert "/p/profile" not in [link["url"] for link in links]


def test_admin_feature_modules_can_be_disabled_and_navigation_stays_separate(
    client: TestClient,
    admin_headers: dict[str, str],
):
    assert client.get("/api/admin/feature-links").status_code == 403

    disabled = client.patch(
        "/api/admin/feature-links/feat_profile",
        headers=admin_headers,
        json={"enabled": False},
    )
    assert disabled.status_code == 200
    assert disabled.json()["enabled"] is False

    navigation = client.post(
        "/api/admin/navigation-links",
        headers=admin_headers,
        json={
            "title": "赛事规则",
            "description": "查看比赛规则文档",
            "url": "https://example.com/rules",
        },
    )
    assert navigation.status_code == 201

    public_features = client.get("/api/feature-links").json()
    public_navigation = client.get("/api/navigation-links").json()

    assert "/p/profile" not in [link["url"] for link in public_features]
    assert "https://example.com/rules" in [link["url"] for link in public_navigation]


def test_admin_event_location_can_be_saved_and_read_publicly(
    client: TestClient,
    admin_headers: dict[str, str],
):
    empty = client.get("/api/event-location").json()
    assert empty["name"] == ""

    saved = client.put(
        "/api/admin/event-location",
        headers=admin_headers,
        json={
            "name": "Demo Hall",
            "address": "Demo Hall, Example Street",
            "latitude": 31.2304,
            "longitude": 121.4737,
            "osmType": "node",
            "osmId": "123",
            "osmUrl": "https://www.openstreetmap.org/node/123",
        },
    )
    assert saved.status_code == 200
    assert saved.json()["name"] == "Demo Hall"

    public_location = client.get("/api/event-location").json()
    assert public_location["latitude"] == 31.2304
    assert public_location["osmUrl"] == "https://www.openstreetmap.org/node/123"


def test_site_config_defaults_and_staged_countdown_validation(
    client: TestClient,
    admin_headers: dict[str, str],
):
    defaults = client.get("/api/site-config")
    assert defaults.status_code == 200
    assert defaults.json()["eventName"] == "Hackathon"
    assert defaults.json()["timezone"] == "Asia/Shanghai"
    assert defaults.json()["countdownStages"] == []
    assert defaults.json()["walkupCheckinEnabled"] is False

    saved = client.put(
        "/api/admin/site-config",
        headers=admin_headers,
        json={
            "eventName": "HackHub 2026",
            "timezone": "Asia/Tokyo",
            "countdownEnabled": True,
            "walkupCheckinEnabled": True,
            "countdownStages": [
                {"id": "submit", "label": "提交", "time": "2026-06-10T04:00:00+09:00"},
                {"id": "start", "label": "开赛", "time": "2026-06-09T10:00:00+09:00"},
            ],
        },
    )
    assert saved.status_code == 200
    payload = saved.json()
    assert payload["eventName"] == "HackHub 2026"
    assert payload["timezone"] == "Asia/Tokyo"
    assert payload["countdownEnabled"] is True
    assert payload["walkupCheckinEnabled"] is True
    assert [stage["id"] for stage in payload["countdownStages"]] == ["start", "submit"]
    assert payload["countdownStages"][0]["time"] == "2026-06-09T01:00:00Z"
    assert payload["countdownStages"][1]["time"] == "2026-06-09T19:00:00Z"

    public_config = client.get("/api/site-config").json()
    assert public_config["eventName"] == "HackHub 2026"
    assert public_config["walkupCheckinEnabled"] is True
    assert public_config["countdownStages"] == payload["countdownStages"]

    invalid_timezone = client.put(
        "/api/admin/site-config",
        headers=admin_headers,
        json={"eventName": "HackHub", "timezone": "UTC+8", "countdownStages": []},
    )
    assert invalid_timezone.status_code == 400

    empty_name = client.put(
        "/api/admin/site-config",
        headers=admin_headers,
        json={"eventName": "  ", "timezone": "UTC", "countdownStages": []},
    )
    assert empty_name.status_code == 400


def test_navigation_link_show_on_home_filter(
    client: TestClient,
    admin_headers: dict[str, str],
):
    public_link = client.post(
        "/api/admin/navigation-links",
        headers=admin_headers,
        json={
            "title": "活动手册",
            "description": "对外开放的赛事手册",
            "url": "https://example.com/handbook",
            "showOnHome": True,
        },
    )
    assert public_link.status_code == 201
    public_payload = public_link.json()
    assert public_payload["showOnHome"] is True
    public_id = public_payload["id"]

    private_link = client.post(
        "/api/admin/navigation-links",
        headers=admin_headers,
        json={
            "title": "内部资料",
            "description": "登录后才看到的资料",
            "url": "/p/dashboard",
        },
    )
    assert private_link.status_code == 201
    private_payload = private_link.json()
    assert private_payload["showOnHome"] is False

    # 默认拉取 = 全部启用项；首页过滤仅返回显式勾选的。
    all_links = client.get("/api/navigation-links").json()
    home_links = client.get("/api/navigation-links?home=true").json()
    all_urls = [link["url"] for link in all_links]
    home_urls = [link["url"] for link in home_links]
    assert "https://example.com/handbook" in all_urls
    assert "/p/dashboard" in all_urls
    assert home_urls == ["https://example.com/handbook"]


def test_navigation_link_patch_toggle_and_delete(
    client: TestClient,
    admin_headers: dict[str, str],
):
    created = client.post(
        "/api/admin/navigation-links",
        headers=admin_headers,
        json={
            "title": "外部社区",
            "description": "Discord 群组",
            "url": "https://example.com/discord",
        },
    )
    assert created.status_code == 201
    link_id = created.json()["id"]
    assert created.json()["showOnHome"] is False

    home_links = client.get("/api/navigation-links?home=true").json()
    assert link_id not in [row["id"] for row in home_links]

    toggled = client.patch(
        f"/api/admin/navigation-links/{link_id}",
        headers=admin_headers,
        json={"showOnHome": True},
    )
    assert toggled.status_code == 200
    assert toggled.json()["showOnHome"] is True

    home_links = client.get("/api/navigation-links?home=true").json()
    assert link_id in [row["id"] for row in home_links]

    disabled = client.patch(
        f"/api/admin/navigation-links/{link_id}",
        headers=admin_headers,
        json={"enabled": False},
    )
    assert disabled.status_code == 200
    assert disabled.json()["enabled"] is False

    # 停用后，公开列表（无论是否过滤 home）都不应再返回它。
    assert link_id not in [row["id"] for row in client.get("/api/navigation-links").json()]
    assert link_id not in [row["id"] for row in client.get("/api/navigation-links?home=true").json()]
    # 但管理员视图还能看到。
    admin_visible = client.get("/api/admin/navigation-links", headers=admin_headers).json()
    assert link_id in [row["id"] for row in admin_visible]

    deleted = client.delete(
        f"/api/admin/navigation-links/{link_id}", headers=admin_headers
    )
    assert deleted.status_code == 204

    after = client.get("/api/admin/navigation-links", headers=admin_headers).json()
    assert link_id not in [row["id"] for row in after]

    missing = client.delete(
        f"/api/admin/navigation-links/{link_id}", headers=admin_headers
    )
    assert missing.status_code == 404
