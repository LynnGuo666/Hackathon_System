from collections.abc import Callable

from fastapi.testclient import TestClient


def _submit_enrollment(client: TestClient, email: str = "life@example.com"):
    return client.post(
        "/api/enrollment",
        json={
            "fullName": "Life Cycle",
            "email": email,
            "phone": "",
            "school": "",
            "teamName": "",
            "personalBio": "",
            "projectDesc": "",
            "participationHistory": "",
            "githubUrl": "",
            "portfolioUrl": "",
        },
    )


def test_enrollment_acceptance_is_required_before_checkin(
    client: TestClient,
    admin_headers: dict[str, str],
    login: Callable[[str], None],
    import_checkins: Callable[[list[str]], None],
):
    login("life@example.com")
    submitted = _submit_enrollment(client)
    assert submitted.status_code == 201
    assert submitted.json()["reviewStatus"] == "pending"

    import_checkins(["200001"])
    early_checkin = client.post("/api/checkin/claim", json={"checkinId": "200001"})
    assert early_checkin.status_code == 409

    enrollment_id = submitted.json()["id"]
    initial = client.post(
        f"/api/admin/enrollments/{enrollment_id}/initial-review",
        headers=admin_headers,
        json={"note": "initial ok"},
    )
    assert initial.status_code == 200
    assert initial.json()["reviewStatus"] == "initial_review"

    still_not_final = client.post("/api/checkin/claim", json={"checkinId": "200001"})
    assert still_not_final.status_code == 409

    final = client.post(
        f"/api/admin/enrollments/{enrollment_id}/final-review",
        headers=admin_headers,
        json={"note": "final ok"},
    )
    assert final.status_code == 200
    assert final.json()["reviewStatus"] == "approved"

    checked_in = client.post("/api/checkin/claim", json={"checkinId": "200001"})
    assert checked_in.status_code == 200
    assert checked_in.json()["status"] == "checked_in"


def test_rejected_enrollment_cannot_checkin(
    client: TestClient,
    admin_headers: dict[str, str],
    login: Callable[[str], None],
    import_checkins: Callable[[list[str]], None],
):
    login("reject@example.com")
    submitted = _submit_enrollment(client, "reject@example.com")
    assert submitted.status_code == 201

    rejected = client.post(
        f"/api/admin/enrollments/{submitted.json()['id']}/initial-review?approve=false",
        headers=admin_headers,
        json={"note": "no"},
    )
    assert rejected.status_code == 200
    assert rejected.json()["reviewStatus"] == "rejected"

    import_checkins(["200002"])
    checked_in = client.post("/api/checkin/claim", json={"checkinId": "200002"})
    assert checked_in.status_code == 409
