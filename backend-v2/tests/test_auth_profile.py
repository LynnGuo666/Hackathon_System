import re
from collections.abc import Callable

from fastapi.testclient import TestClient


def test_send_code_prints_debug_log(client: TestClient, capfd):
    response = client.post("/api/auth/send-code", json={"email": "Debug@Example.com"})
    captured = capfd.readouterr()

    assert response.status_code == 202
    assert re.search(
        r"\[auth\] verification code for debug@example\.com: \d{6}",
        captured.out,
    )


def test_profile_requires_login_and_fields(
    client: TestClient,
    admin_headers: dict[str, str],
    import_checkins: Callable[[list[str]], None],
):
    assert client.put("/api/profile", json={}).status_code == 401
    client.post("/api/auth/send-code", json={"email": "Profile@Example.com"})
    code_email = client.get("/api/admin/email-outbox", headers=admin_headers).json()[0]["body"]
    code = code_email.split("是 ")[1].split("，")[0]
    client.post("/api/auth/verify-code", json={"email": "Profile@Example.com", "code": code})

    invalid = client.put("/api/profile", json={"fullName": "Ada"})
    assert invalid.status_code == 401
    import_checkins(["200001"])
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


def test_checkin_login_links_email_and_profile(
    client: TestClient,
    import_checkins: Callable[[list[str]], None],
):
    import_checkins(["300001"])

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
