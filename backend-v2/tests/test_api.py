from pathlib import Path
import re

from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.dependencies import get_repository
from app.main import create_app


def make_client(tmp_path: Path) -> TestClient:
    db_path = tmp_path / "test.sqlite"

    get_settings.cache_clear()
    get_repository.cache_clear()

    def override_settings():
        from app.core.config import Settings

        return Settings(DATABASE_PATH=str(db_path), ADMIN_TOKEN="secret")

    app = create_app()
    app.dependency_overrides[get_settings] = override_settings
    return TestClient(app)


def login(client: TestClient, email: str = "user@example.com") -> None:
    client.post("/api/auth/send-code", json={"email": email})
    emails = client.get(
        "/api/admin/email-outbox", headers={"X-Admin-Token": "secret"}
    ).json()
    body = next(row["body"] for row in reversed(emails) if row["to"] == email.lower())
    code = body.split("是 ")[1].split("，")[0]
    client.post("/api/auth/verify-code", json={"email": email, "code": code})


def import_checkins(client: TestClient, values: list[str]) -> None:
    response = client.post(
        "/api/admin/checkin-ids/import",
        headers={"X-Admin-Token": "secret"},
        json={"values": values},
    )
    assert response.status_code == 201


def test_public_seeded_feature_links_and_health(tmp_path: Path):
    client = make_client(tmp_path)

    assert client.get("/api/health").json() == {"status": "ok"}
    features = client.get("/api/feature-links").json()
    links = client.get("/api/navigation-links").json()

    assert [link["url"] for link in features][:2] == ["/p/profile", "/p/accommodation"]
    assert "/p/profile" not in [link["url"] for link in links]


def test_admin_feature_modules_can_be_disabled_and_navigation_stays_separate(tmp_path: Path):
    client = make_client(tmp_path)

    assert client.get("/api/admin/feature-links").status_code == 403

    disabled = client.patch(
        "/api/admin/feature-links/feat_profile",
        headers={"X-Admin-Token": "secret"},
        json={"enabled": False},
    )
    assert disabled.status_code == 200
    assert disabled.json()["enabled"] is False

    navigation = client.post(
        "/api/admin/navigation-links",
        headers={"X-Admin-Token": "secret"},
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


def test_admin_event_location_can_be_saved_and_read_publicly(tmp_path: Path):
    client = make_client(tmp_path)

    empty = client.get("/api/event-location").json()
    assert empty["name"] == ""

    saved = client.put(
        "/api/admin/event-location",
        headers={"X-Admin-Token": "secret"},
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


def test_site_config_defaults_and_staged_countdown_validation(tmp_path: Path):
    client = make_client(tmp_path)

    defaults = client.get("/api/site-config")
    assert defaults.status_code == 200
    assert defaults.json()["eventName"] == "Hackathon"
    assert defaults.json()["timezone"] == "Asia/Shanghai"
    assert defaults.json()["countdownStages"] == []

    saved = client.put(
        "/api/admin/site-config",
        headers={"X-Admin-Token": "secret"},
        json={
            "eventName": "HackHub 2026",
            "timezone": "Asia/Tokyo",
            "countdownEnabled": True,
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
    assert [stage["id"] for stage in payload["countdownStages"]] == ["start", "submit"]
    assert payload["countdownStages"][0]["time"] == "2026-06-09T01:00:00Z"
    assert payload["countdownStages"][1]["time"] == "2026-06-09T19:00:00Z"

    public_config = client.get("/api/site-config").json()
    assert public_config["eventName"] == "HackHub 2026"
    assert public_config["countdownStages"] == payload["countdownStages"]

    invalid_timezone = client.put(
        "/api/admin/site-config",
        headers={"X-Admin-Token": "secret"},
        json={"eventName": "HackHub", "timezone": "UTC+8", "countdownStages": []},
    )
    assert invalid_timezone.status_code == 400

    empty_name = client.put(
        "/api/admin/site-config",
        headers={"X-Admin-Token": "secret"},
        json={"eventName": "  ", "timezone": "UTC", "countdownStages": []},
    )
    assert empty_name.status_code == 400


def test_admin_overview_requires_token_and_returns_aggregates(tmp_path: Path):
    client = make_client(tmp_path)

    assert client.get("/api/admin/overview").status_code == 403

    login(client, "Overview@Example.com")
    import_checkins(client, ["510001"])
    assert client.post("/api/auth/bind-checkin", json={"checkinId": "510001"}).status_code == 200

    pool = client.post(
        "/api/admin/resources/pools",
        headers={"X-Admin-Token": "secret"},
        json={"name": "后台首页资源", "type": "code"},
    ).json()
    imported = client.post(
        f"/api/admin/resources/pools/{pool['id']}/items/import",
        headers={"X-Admin-Token": "secret"},
        json={"values": ["OVERVIEW-CODE"]},
    )
    assert imported.status_code == 201

    overview = client.get(
        "/api/admin/overview", headers={"X-Admin-Token": "secret"}
    )
    assert overview.status_code == 200
    payload = overview.json()

    assert payload["participants"]["total"] == 1
    assert payload["participants"]["checkedIn"] == 1
    assert payload["checkinIds"]["total"] == 1
    assert payload["checkinIds"]["bound"] == 1
    assert payload["resources"]["pools"] == 1
    assert payload["resources"]["items"] == 1
    assert payload["resources"]["availableItems"] == 1
    assert payload["emails"]["total"] >= 1
    assert payload["meals"]["mealSlots"] == 0
    assert "siteConfig" in payload["configuration"]
    assert payload["configuration"]["featureLinks"] >= 1


def test_admin_accommodation_requests_list_empty_data_and_auth(tmp_path: Path):
    client = make_client(tmp_path)

    assert client.get("/api/admin/accommodation-requests").status_code == 403

    empty = client.get(
        "/api/admin/accommodation-requests", headers={"X-Admin-Token": "secret"}
    )
    assert empty.status_code == 200
    assert empty.json() == []

    login(client, "Stay@Example.com")
    import_checkins(client, ["520001"])
    assert client.post("/api/auth/bind-checkin", json={"checkinId": "520001"}).status_code == 200

    saved = client.put(
        "/api/accommodation",
        json={"selections": ["sleeping_bag", "other"], "otherDetail": "  近插座  "},
    )
    assert saved.status_code == 200

    requests = client.get(
        "/api/admin/accommodation-requests", headers={"X-Admin-Token": "secret"}
    )
    assert requests.status_code == 200
    assert requests.json() == [
        {
            "email": "stay@example.com",
            "selections": ["sleeping_bag", "other"],
            "otherDetail": "近插座",
            "createdAt": saved.json()["createdAt"],
            "updatedAt": saved.json()["updatedAt"],
        }
    ]


def test_send_code_prints_debug_log(tmp_path: Path, capfd):
    client = make_client(tmp_path)

    response = client.post("/api/auth/send-code", json={"email": "Debug@Example.com"})
    captured = capfd.readouterr()

    assert response.status_code == 202
    assert re.search(
        r"\[auth\] verification code for debug@example\.com: \d{6}",
        captured.out,
    )


def test_profile_requires_login_and_fields(tmp_path: Path):
    client = make_client(tmp_path)

    assert client.put("/api/profile", json={}).status_code == 401
    client.post("/api/auth/send-code", json={"email": "Profile@Example.com"})
    code_email = client.get(
        "/api/admin/email-outbox", headers={"X-Admin-Token": "secret"}
    ).json()[0]["body"]
    code = code_email.split("是 ")[1].split("，")[0]
    client.post("/api/auth/verify-code", json={"email": "Profile@Example.com", "code": code})

    invalid = client.put("/api/profile", json={"fullName": "Ada"})
    assert invalid.status_code == 401
    import_checkins(client, ["200001"])
    bound = client.post("/api/auth/bind-checkin", json={"checkinId": "200001"})
    assert bound.status_code == 200

    saved = client.put(
        "/api/profile",
        json={
            "fullName": " Ada Lovelace ",
            "teamName": "",
            "school": "",
            "phone": "",
        },
    )
    assert saved.status_code == 200
    assert saved.json()["fullName"] == "Ada Lovelace"


def test_checkin_login_links_email_and_profile(tmp_path: Path):
    client = make_client(tmp_path)
    import_checkins(client, ["300001"])

    linked = client.post(
        "/api/auth/checkin-login",
        json={"checkinId": "300001", "email": "Checkin@Example.com", "fullName": "  Lyn  "},
    )
    assert linked.status_code == 200
    assert linked.json()["email"] == "checkin@example.com"
    assert linked.json()["checkinId"] == "300001"

    profile = client.get("/api/profile")
    assert profile.status_code == 200
    assert profile.json()["fullName"] == "Lyn"


def test_checkin_and_resource_claim(tmp_path: Path):
    client = make_client(tmp_path)

    client.post("/api/auth/send-code", json={"email": "a@example.com"})
    body = client.get("/api/admin/email-outbox", headers={"X-Admin-Token": "secret"}).json()[0][
        "body"
    ]
    code = body.split("是 ")[1].split("，")[0]
    client.post("/api/auth/verify-code", json={"email": "a@example.com", "code": code})
    import_checkins(client, ["100001"])
    bound = client.post("/api/auth/bind-checkin", json={"checkinId": "100001"})
    assert bound.status_code == 200

    pool = client.post(
        "/api/admin/resources/pools",
        headers={"X-Admin-Token": "secret"},
        json={"name": "AI 兑换码", "type": "code"},
    ).json()
    imported = client.post(
        f"/api/admin/resources/pools/{pool['id']}/items/import",
        headers={"X-Admin-Token": "secret"},
        json={"codes": ["CODE-1"]},
    )
    assert imported.status_code == 201

    claimed = client.post(f"/api/resources/{pool['id']}/claim")
    assert claimed.status_code == 201
    assert claimed.json()["plainCode"] == "CODE-1"

    duplicate = client.post(f"/api/resources/{pool['id']}/claim")
    assert duplicate.status_code == 409


def test_resource_pool_can_allow_multiple_claims(tmp_path: Path):
    client = make_client(tmp_path)

    client.post("/api/auth/send-code", json={"email": "multi@example.com"})
    body = client.get("/api/admin/email-outbox", headers={"X-Admin-Token": "secret"}).json()[0][
        "body"
    ]
    code = body.split("是 ")[1].split("，")[0]
    client.post("/api/auth/verify-code", json={"email": "multi@example.com", "code": code})
    import_checkins(client, ["100002"])
    client.post("/api/auth/bind-checkin", json={"checkinId": "100002"})

    pool = client.post(
        "/api/admin/resources/pools",
        headers={"X-Admin-Token": "secret"},
        json={"name": "多次发放资源", "type": "code", "allowMultipleClaims": True},
    ).json()
    imported = client.post(
        f"/api/admin/resources/pools/{pool['id']}/items/import",
        headers={"X-Admin-Token": "secret"},
        json={"values": ["CODE-1", "CODE-2"]},
    )
    assert imported.status_code == 201

    first = client.post(f"/api/resources/{pool['id']}/claim")
    second = client.post(f"/api/resources/{pool['id']}/claim")

    assert first.status_code == 201
    assert second.status_code == 201
    assert {first.json()["plainCode"], second.json()["plainCode"]} == {"CODE-1", "CODE-2"}


def test_checkin_id_pool_generation_import_and_binding_rules(tmp_path: Path):
    client = make_client(tmp_path)

    assert client.get("/api/admin/checkin-ids").status_code == 403

    generated = client.post(
        "/api/admin/checkin-ids/generate",
        headers={"X-Admin-Token": "secret"},
        json={"count": 5},
    )
    assert generated.status_code == 201
    generated_ids = [row["id"] for row in generated.json()]
    assert len(generated_ids) == 5
    assert len(set(generated_ids)) == 5
    assert all(re.fullmatch(r"\d{6}", checkin_id) for checkin_id in generated_ids)

    invalid_import = client.post(
        "/api/admin/checkin-ids/import",
        headers={"X-Admin-Token": "secret"},
        json={"values": ["ABC123"]},
    )
    assert invalid_import.status_code == 400

    imported = client.post(
        "/api/admin/checkin-ids/import",
        headers={"X-Admin-Token": "secret"},
        json={"values": ["000001", "000001", "000002"]},
    )
    assert imported.status_code == 201
    assert [row["id"] for row in imported.json()] == ["000001", "000002"]

    login(client, "pool-a@example.com")
    unknown = client.post("/api/auth/bind-checkin", json={"checkinId": "999999"})
    assert unknown.status_code == 404

    bound = client.post("/api/auth/bind-checkin", json={"checkinId": "000001"})
    assert bound.status_code == 200
    assert bound.json()["checkinId"] == "000001"

    same_again = client.post("/api/auth/bind-checkin", json={"checkinId": "000001"})
    assert same_again.status_code == 200

    switch = client.post("/api/auth/bind-checkin", json={"checkinId": "000002"})
    assert switch.status_code == 409

    duplicate = client.post(
        "/api/auth/bind-checkin",
        headers={"X-Participant-Email": "pool-b@example.com"},
        json={"checkinId": "000001"},
    )
    assert duplicate.status_code == 409

    accounts = client.get("/api/admin/participants", headers={"X-Admin-Token": "secret"}).json()
    assert "pool-a@example.com" in [row["email"] for row in accounts]

    disabled = client.patch(
        "/api/admin/participants/status",
        headers={"X-Admin-Token": "secret"},
        json={"email": "pool-b@example.com", "status": "disabled"},
    )
    assert disabled.status_code == 404

    login(client, "pool-b@example.com")
    disabled = client.patch(
        "/api/admin/participants/status",
        headers={"X-Admin-Token": "secret"},
        json={"email": "pool-b@example.com", "status": "disabled"},
    )
    assert disabled.status_code == 200
    assert client.get("/api/me", headers={"X-Participant-Email": "pool-b@example.com"}).status_code == 401


def test_meal_and_drink_orders_respect_open_windows(tmp_path: Path):
    client = make_client(tmp_path)

    assert client.get("/api/meal-orders").status_code == 401
    login(client, "Meal@Example.com")
    assert client.get("/api/meal-orders").status_code == 401
    import_checkins(client, ["400001"])
    assert client.post("/api/auth/bind-checkin", json={"checkinId": "400001"}).status_code == 200

    meal_slot = client.post(
        "/api/admin/meal-slots",
        headers={"X-Admin-Token": "secret"},
        json={
            "title": "Day 1 午餐",
            "serviceDate": "2026-06-12",
            "serviceTime": "12:00",
            "orderDeadline": "2099-01-01T00:00",
            "isOpen": True,
            "enabled": True,
            "dietaryOptions": ["无特殊忌口", "素食", "其他"],
        },
    )
    assert meal_slot.status_code == 201
    meal_id = meal_slot.json()["id"]

    saved_meal = client.put(
        f"/api/meal-slots/{meal_id}/order",
        json={"dietaryNeeds": ["素食", "其他"], "otherDetail": "  不要葱  ", "notes": "  少油  "},
    )
    assert saved_meal.status_code == 200
    assert saved_meal.json()["dietaryNeeds"] == ["素食", "其他"]
    assert saved_meal.json()["otherDetail"] == "不要葱"

    updated_meal = client.put(
        f"/api/meal-orders/{meal_id}",
        json={"dietaryNeeds": ["无特殊忌口"], "otherDetail": "忽略", "notes": ""},
    )
    assert updated_meal.status_code == 200
    assert updated_meal.json()["otherDetail"] == ""

    meal_orders = client.get(
        "/api/admin/meal-orders", headers={"X-Admin-Token": "secret"}
    ).json()
    assert len(meal_orders) == 1
    assert meal_orders[0]["slotId"] == meal_id

    client.put(
        f"/api/admin/meal-slots/{meal_id}",
        headers={"X-Admin-Token": "secret"},
        json={
            "title": "Day 1 午餐",
            "serviceDate": "2026-06-12",
            "serviceTime": "12:00",
            "orderDeadline": "2000-01-01T00:00",
            "isOpen": True,
            "enabled": True,
            "dietaryOptions": ["无特殊忌口", "素食", "其他"],
        },
    )
    closed_meal = client.put(
        f"/api/meal-slots/{meal_id}/order",
        json={"dietaryNeeds": ["素食"], "otherDetail": "", "notes": ""},
    )
    assert closed_meal.status_code == 409

    drink_slot = client.post(
        "/api/admin/drink-slots",
        headers={"X-Admin-Token": "secret"},
        json={
            "title": "下午饮料补给",
            "serviceDate": "2026-06-12",
            "serviceTime": "15:00",
            "orderDeadline": "2099-01-01T00:00",
            "isOpen": True,
            "enabled": True,
            "drinkOptions": ["矿泉水", "无糖茶"],
        },
    )
    assert drink_slot.status_code == 201
    drink_id = drink_slot.json()["id"]

    invalid_drink = client.put(
        f"/api/drink-slots/{drink_id}/order",
        json={"drinkOption": "咖啡", "notes": ""},
    )
    assert invalid_drink.status_code == 400

    saved_drink = client.put(
        f"/api/drink-orders/{drink_id}",
        json={"drinkOption": "无糖茶", "notes": "  冰的  "},
    )
    assert saved_drink.status_code == 200
    assert saved_drink.json()["drinkOption"] == "无糖茶"
    assert saved_drink.json()["notes"] == "冰的"

    drink_orders = client.get(
        "/api/admin/drink-orders", headers={"X-Admin-Token": "secret"}
    ).json()
    assert len(drink_orders) == 1
    assert drink_orders[0]["slotId"] == drink_id
