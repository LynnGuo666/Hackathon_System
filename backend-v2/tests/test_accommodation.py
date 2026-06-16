from collections.abc import Callable

from fastapi.testclient import TestClient


def test_admin_accommodation_requests_list_empty_data_and_auth(
    client: TestClient,
    admin_headers: dict[str, str],
    import_checkins: Callable[[list[str]], None],
    approve_enrollment: Callable[[str], None],
):
    assert client.get("/api/admin/accommodation-requests").status_code == 403

    empty = client.get("/api/admin/accommodation-requests", headers=admin_headers)
    assert empty.status_code == 200
    assert empty.json() == []

    approve_enrollment("Stay@Example.com")
    import_checkins(["520001"])
    assert client.post("/api/auth/bind-checkin", json={"checkinId": "520001"}).status_code == 200

    saved = client.put(
        "/api/accommodation",
        json={"selections": ["sleeping_bag", "other"], "otherDetail": "  近插座  "},
    )
    assert saved.status_code == 200

    requests = client.get("/api/admin/accommodation-requests", headers=admin_headers)
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
