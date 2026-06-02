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
    assert invalid.status_code == 400

    saved = client.put(
        "/api/profile",
        json={
            "fullName": " Ada Lovelace ",
            "teamName": " Engines ",
            "school": " London ",
            "phone": " 123456 ",
        },
    )
    assert saved.status_code == 200
    assert saved.json()["fullName"] == "Ada Lovelace"


def test_checkin_and_resource_claim(tmp_path: Path):
    client = make_client(tmp_path)

    client.post("/api/auth/send-code", json={"email": "a@example.com"})
    body = client.get("/api/admin/email-outbox", headers={"X-Admin-Token": "secret"}).json()[0][
        "body"
    ]
    code = body.split("是 ")[1].split("，")[0]
    client.post("/api/auth/verify-code", json={"email": "a@example.com", "code": code})
    bound = client.post("/api/auth/bind-checkin", json={"checkinId": "CHECKIN-001"})
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
    client.post("/api/auth/bind-checkin", json={"checkinId": "CHECKIN-MULTI"})

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
    assert [first.json()["plainCode"], second.json()["plainCode"]] == ["CODE-1", "CODE-2"]
