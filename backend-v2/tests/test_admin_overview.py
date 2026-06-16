from collections.abc import Callable

from fastapi.testclient import TestClient


def test_admin_overview_requires_token_and_returns_aggregates(
    client: TestClient,
    admin_headers: dict[str, str],
    import_checkins: Callable[[list[str]], None],
    approve_enrollment: Callable[[str], None],
):
    assert client.get("/api/admin/overview").status_code == 403

    approve_enrollment("Overview@Example.com")
    import_checkins(["510001"])
    assert client.post("/api/auth/bind-checkin", json={"checkinId": "510001"}).status_code == 200

    pool = client.post(
        "/api/admin/resources/pools",
        headers=admin_headers,
        json={"name": "后台首页资源", "type": "code"},
    ).json()
    imported = client.post(
        f"/api/admin/resources/pools/{pool['id']}/items/import",
        headers=admin_headers,
        json={"values": ["OVERVIEW-CODE"]},
    )
    assert imported.status_code == 201

    overview = client.get("/api/admin/overview", headers=admin_headers)
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
