from collections.abc import Callable

from fastapi.testclient import TestClient


def test_checkin_and_resource_claim(
    client: TestClient,
    admin_headers: dict[str, str],
    import_checkins: Callable[[list[str]], None],
    approve_enrollment: Callable[[str], None],
):
    approve_enrollment("a@example.com")
    import_checkins(["100001"])
    bound = client.post("/api/auth/bind-checkin", json={"checkinId": "100001"})
    assert bound.status_code == 200
    assert bound.json()["status"] == "checked_in"

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
    approve_enrollment: Callable[[str], None],
):
    approve_enrollment("multi@example.com")
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
