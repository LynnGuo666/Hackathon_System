from pathlib import Path

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


def test_public_seeded_navigation_and_health(tmp_path: Path):
    client = make_client(tmp_path)

    assert client.get("/api/health").json() == {"status": "ok"}
    links = client.get("/api/navigation-links").json()

    assert [link["url"] for link in links][:2] == ["/p/profile", "/p/accommodation"]


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
