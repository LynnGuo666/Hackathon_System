import re
from collections.abc import Callable

from fastapi.testclient import TestClient


def test_checkin_id_pool_generation_import_and_binding_rules(
    client: TestClient,
    admin_headers: dict[str, str],
    login: Callable[[str], None],
    approve_enrollment: Callable[[str], None],
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

    not_accepted = client.post("/api/auth/bind-checkin", json={"checkinId": "000001"})
    assert not_accepted.status_code == 409

    approve_enrollment("pool-a@example.com")
    bound = client.post("/api/auth/bind-checkin", json={"checkinId": "000001"})
    assert bound.status_code == 200
    assert bound.json()["checkinId"] == "000001"
    assert bound.json()["status"] == "checked_in"

    same_again = client.post("/api/auth/bind-checkin", json={"checkinId": "000001"})
    assert same_again.status_code == 200

    switch = client.post("/api/auth/bind-checkin", json={"checkinId": "000002"})
    assert switch.status_code == 409

    approve_enrollment("pool-b@example.com")
    duplicate = client.post("/api/auth/bind-checkin", json={"checkinId": "000001"})
    assert duplicate.status_code == 409

    accounts = client.get("/api/admin/participants", headers=admin_headers).json()
    assert "pool-a@example.com" in [row["email"] for row in accounts]

    disabled = client.patch(
        "/api/admin/participants/status",
        headers=admin_headers,
        json={"email": "pool-b@example.com", "status": "disabled"},
    )
    assert disabled.status_code == 200
    assert client.get("/api/me").status_code == 401
