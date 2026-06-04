import re
from collections.abc import Callable

from fastapi.testclient import TestClient


def test_checkin_id_pool_generation_import_and_binding_rules(
    client: TestClient,
    admin_headers: dict[str, str],
    login: Callable[[str], None],
):
    assert client.get("/api/admin/checkin-ids").status_code == 403

    generated = client.post(
        "/api/admin/checkin-ids/generate",
        headers=admin_headers,
        json={"count": 5},
    )
    assert generated.status_code == 201
    generated_ids = [row["id"] for row in generated.json()]
    assert len(generated_ids) == 5
    assert len(set(generated_ids)) == 5
    assert all(re.fullmatch(r"\d{6}", checkin_id) for checkin_id in generated_ids)

    invalid_import = client.post(
        "/api/admin/checkin-ids/import",
        headers=admin_headers,
        json={"values": ["ABC123"]},
    )
    assert invalid_import.status_code == 400

    imported = client.post(
        "/api/admin/checkin-ids/import",
        headers=admin_headers,
        json={"values": ["000001", "000001", "000002"]},
    )
    assert imported.status_code == 201
    assert [row["id"] for row in imported.json()] == ["000001", "000002"]

    login("pool-a@example.com")
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

    accounts = client.get("/api/admin/participants", headers=admin_headers).json()
    assert "pool-a@example.com" in [row["email"] for row in accounts]

    disabled = client.patch(
        "/api/admin/participants/status",
        headers=admin_headers,
        json={"email": "pool-b@example.com", "status": "disabled"},
    )
    assert disabled.status_code == 404

    login("pool-b@example.com")
    disabled = client.patch(
        "/api/admin/participants/status",
        headers=admin_headers,
        json={"email": "pool-b@example.com", "status": "disabled"},
    )
    assert disabled.status_code == 200
    assert client.get("/api/me", headers={"X-Participant-Email": "pool-b@example.com"}).status_code == 401
