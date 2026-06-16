from fastapi.testclient import TestClient


def test_email_provider_config_in_site_config(client: TestClient, admin_headers: dict[str, str]):
    resp = client.get("/api/site-config")
    assert resp.status_code == 200
    data = resp.json()
    assert data["emailProvider"] == "disabled"


def test_update_email_provider_config(client: TestClient, admin_headers: dict[str, str]):
    current = client.get("/api/site-config").json()
    current["emailProvider"] = "smtp"
    current["smtpHost"] = "smtp.example.com"
    current["smtpPort"] = 465
    current["smtpSecurity"] = "ssl"

    resp = client.put("/api/admin/site-config", headers=admin_headers, json=current)
    assert resp.status_code == 200
    data = resp.json()
    assert data["emailProvider"] == "smtp"
    assert data["smtpHost"] == "smtp.example.com"
    assert data["smtpPort"] == 465
    assert data["smtpSecurity"] == "ssl"


def test_email_secrets_api_flow(client: TestClient, admin_headers: dict[str, str]):
    # 列表初始为空
    resp = client.get("/api/admin/email-secrets", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["keys"] == []

    # 设置凭据
    resp = client.put(
        "/api/admin/email-secrets/smtp_password",
        headers=admin_headers,
        json={"value": "my-secret-password"},
    )
    assert resp.status_code == 200

    # 列表显示已设置
    resp = client.get("/api/admin/email-secrets", headers=admin_headers)
    assert resp.json()["keys"] == ["smtp_password"]

    # 删除凭据
    resp = client.delete("/api/admin/email-secrets/smtp_password", headers=admin_headers)
    assert resp.status_code == 200

    # 列表为空
    resp = client.get("/api/admin/email-secrets", headers=admin_headers)
    assert resp.json()["keys"] == []


def test_email_secrets_empty_value_deletes(client: TestClient, admin_headers: dict[str, str]):
    client.put(
        "/api/admin/email-secrets/test_key",
        headers=admin_headers,
        json={"value": "some-value"},
    )
    assert client.get("/api/admin/email-secrets", headers=admin_headers).json()["keys"] == ["test_key"]

    client.put(
        "/api/admin/email-secrets/test_key",
        headers=admin_headers,
        json={"value": ""},
    )
    assert client.get("/api/admin/email-secrets", headers=admin_headers).json()["keys"] == []


def test_http_provider_config_update(client: TestClient, admin_headers: dict[str, str]):
    current = client.get("/api/site-config").json()
    current["emailProvider"] = "http"
    current["emailServiceUrl"] = "http://mail-service:8080"
    current["emailServiceAccountId"] = "acc_demo01"

    resp = client.put("/api/admin/site-config", headers=admin_headers, json=current)
    assert resp.status_code == 200
    data = resp.json()
    assert data["emailProvider"] == "http"
    assert data["emailServiceUrl"] == "http://mail-service:8080"
    assert data["emailServiceAccountId"] == "acc_demo01"
