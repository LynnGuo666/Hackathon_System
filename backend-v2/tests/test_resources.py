from collections.abc import Callable

from fastapi.testclient import TestClient


def test_checkin_and_resource_claim(
    client: TestClient,
    admin_headers: dict[str, str],
    import_checkins: Callable[[list[str]], None],
):
    client.post("/api/auth/send-code", json={"email": "a@example.com"})
    body = client.get("/api/admin/email-outbox", headers=admin_headers).json()[0]["body"]
    code = body.split("是 ")[1].split("，")[0]
    client.post("/api/auth/verify-code", json={"email": "a@example.com", "code": code})
    import_checkins(["100001"])
    bound = client.post("/api/auth/bind-checkin", json={"checkinId": "100001"})
    assert bound.status_code == 200

    pool = client.post(
        "/api/admin/resources/pools",
        headers=admin_headers,
        json={"name": "AI 兑换码", "type": "code"},
    ).json()
    imported = client.post(
        f"/api/admin/resources/pools/{pool['id']}/items/import",
        headers=admin_headers,
        json={"codes": ["CODE-1"]},
    )
    assert imported.status_code == 201

    claimed = client.post(f"/api/resources/{pool['id']}/claim")
    assert claimed.status_code == 201
    assert claimed.json()["plainCode"] == "CODE-1"

    duplicate = client.post(f"/api/resources/{pool['id']}/claim")
    assert duplicate.status_code == 409


def test_resource_pool_can_allow_multiple_claims(
    client: TestClient,
    admin_headers: dict[str, str],
    import_checkins: Callable[[list[str]], None],
):
    client.post("/api/auth/send-code", json={"email": "multi@example.com"})
    body = client.get("/api/admin/email-outbox", headers=admin_headers).json()[0]["body"]
    code = body.split("是 ")[1].split("，")[0]
    client.post("/api/auth/verify-code", json={"email": "multi@example.com", "code": code})
    import_checkins(["100002"])
    client.post("/api/auth/bind-checkin", json={"checkinId": "100002"})

    pool = client.post(
        "/api/admin/resources/pools",
        headers=admin_headers,
        json={"name": "多次发放资源", "type": "code", "allowMultipleClaims": True},
    ).json()
    imported = client.post(
        f"/api/admin/resources/pools/{pool['id']}/items/import",
        headers=admin_headers,
        json={"values": ["CODE-1", "CODE-2"]},
    )
    assert imported.status_code == 201

    first = client.post(f"/api/resources/{pool['id']}/claim")
    second = client.post(f"/api/resources/{pool['id']}/claim")

    assert first.status_code == 201
    assert second.status_code == 201
    assert {first.json()["plainCode"], second.json()["plainCode"]} == {"CODE-1", "CODE-2"}
