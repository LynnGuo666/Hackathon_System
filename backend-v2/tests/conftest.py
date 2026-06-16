from collections.abc import Callable
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.dependencies import get_repository
from app.main import create_app


@pytest.fixture
def client(tmp_path: Path) -> TestClient:
    db_path = tmp_path / "test.sqlite"

    get_settings.cache_clear()
    get_repository.cache_clear()

    def override_settings():
        from app.core.config import Settings

        return Settings(DATABASE_PATH=str(db_path), ADMIN_TOKEN="secret")

    app = create_app()
    app.dependency_overrides[get_settings] = override_settings
    return TestClient(app)


@pytest.fixture
def admin_headers() -> dict[str, str]:
    return {"X-Admin-Token": "secret"}


@pytest.fixture
def login(client: TestClient, admin_headers: dict[str, str]) -> Callable[[str], None]:
    def _login(email: str = "user@example.com") -> None:
        client.post("/api/auth/send-code", json={"email": email})
        emails = client.get("/api/admin/email-outbox", headers=admin_headers).json()
        body = next(row["body"] for row in reversed(emails) if row["to"] == email.lower())
        code = body.split("是 ")[1].split("，")[0]
        client.post("/api/auth/verify-code", json={"email": email, "code": code})

    return _login


@pytest.fixture
def import_checkins(client: TestClient, admin_headers: dict[str, str]) -> Callable[[list[str]], None]:
    def _import_checkins(values: list[str]) -> None:
        response = client.post(
            "/api/admin/checkin-ids/import",
            headers=admin_headers,
            json={"values": values},
        )
        assert response.status_code == 201

    return _import_checkins


@pytest.fixture
def approve_enrollment(
    client: TestClient, admin_headers: dict[str, str], login: Callable[[str], None]
) -> Callable[[str], None]:
    def _approve(email: str = "user@example.com") -> None:
        login(email)
        created = client.post(
            "/api/enrollment",
            json={
                "fullName": "Test User",
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
        assert created.status_code in (201, 409)
        enrollments = client.get("/api/admin/enrollments", headers=admin_headers).json()
        enrollment = next(row for row in enrollments if row["email"] == email.lower())
        initial = client.post(
            f"/api/admin/enrollments/{enrollment['id']}/initial-review",
            headers=admin_headers,
            json={"note": "ok"},
        )
        assert initial.status_code == 200
        final = client.post(
            f"/api/admin/enrollments/{enrollment['id']}/final-review",
            headers=admin_headers,
            json={"note": "ok"},
        )
        assert final.status_code == 200

    return _approve
