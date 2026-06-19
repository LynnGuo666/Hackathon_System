from collections.abc import Callable

from fastapi.testclient import TestClient


def test_send_code_queues_verification_email(
    client: TestClient, admin_headers: dict[str, str], capfd
):
    response = client.post("/api/auth/send-code", json={"email": "Debug@Example.com"})
    captured = capfd.readouterr()

    assert response.status_code == 202
    # 默认 emailProvider 为 disabled（mock 模式）：验证码原文不再随响应返回，
    # 而是打印到后端输出，方便开发读取后手动填入。
    assert "verification code" in captured.out
    assert "devCode" not in response.json()
    emails = client.get("/api/admin/email-outbox", headers=admin_headers).json()
    assert emails[0]["to"] == "debug@example.com"


def test_send_code_enforces_cooldown(client: TestClient):
    # 第一次发送应成功。
    assert client.post("/api/auth/send-code", json={"email": "a@b.com"}).status_code == 202
    # 冷却期内再次发送应被拒绝（429），并返回剩余秒数。
    again = client.post("/api/auth/send-code", json={"email": "a@b.com"})
    assert again.status_code == 429
    message = again.json()["error"]
    assert "秒" in message
    assert any(ch.isdigit() for ch in message)


def test_profile_requires_login_and_fields(
    client: TestClient,
    admin_headers: dict[str, str],
    import_checkins: Callable[[list[str]], None],
    approve_enrollment: Callable[[str], None],
):
    assert client.put("/api/profile", json={}).status_code == 401
    approve_enrollment("Profile@Example.com")

    invalid = client.put("/api/profile", json={"fullName": "Ada"})
    assert invalid.status_code == 200
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


def test_checkin_login_cannot_bypass_enrollment_acceptance(
    client: TestClient,
    admin_headers: dict[str, str],
    import_checkins: Callable[[list[str]], None],
):
    import_checkins(["300001"])

    linked = client.post(
        "/api/auth/checkin-login",
        json={"checkinId": "300001", "email": "Checkin@Example.com", "fullName": "  Lyn  "},
    )
    assert linked.status_code == 401

    enabled = client.put(
        "/api/admin/site-config",
        headers=admin_headers,
        json={"eventName": "Hackathon", "timezone": "Asia/Shanghai", "walkupCheckinEnabled": True},
    )
    assert enabled.status_code == 200

    linked = client.post(
        "/api/auth/checkin-login",
        json={"checkinId": "300001", "email": "Checkin@Example.com", "fullName": "  Lyn  "},
    )
    assert linked.status_code == 200
    assert linked.json()["email"] == "checkin@example.com"
    assert linked.json()["checkinId"] == "300001"
    assert linked.json()["status"] == "checked_in"

    profile = client.get("/api/profile")
    assert profile.status_code == 200
    assert profile.json()["fullName"] == "Lyn"
