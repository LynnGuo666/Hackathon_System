import json

from fastapi.testclient import TestClient

from app.core import secrets as secret_store
from app.core.dependencies import get_repository, get_settings
from app.repositories.common import now_utc
from app.repositories.sqlite import SQLiteRepository


def _repo(client: TestClient) -> SQLiteRepository:
    return get_repository(get_settings().database_path)


def test_enqueue_and_list_tasks(client: TestClient):
    repo = _repo(client)
    task = repo.enqueue_task("email_send", {"to": "a@b.com", "subject": "hi", "body": "hello"})
    assert task.task_type == "email_send"
    assert task.status == "pending"
    assert task.attempts == 0

    tasks = repo.list_tasks()
    assert len(tasks) == 1
    assert tasks[0].id == task.id


def test_claim_pending_tasks_marks_sending(client: TestClient):
    repo = _repo(client)
    repo.enqueue_task("email_send", {"to": "a@b.com", "subject": "s1", "body": "b1"})
    repo.enqueue_task("email_send", {"to": "c@d.com", "subject": "s2", "body": "b2"})

    claimed = repo.claim_pending_tasks(limit=10)
    assert len(claimed) == 2
    for t in claimed:
        assert t.status == "sending"
        assert t.locked_at is not None


def test_claim_respects_limit(client: TestClient):
    repo = _repo(client)
    for i in range(5):
        repo.enqueue_task("email_send", {"to": f"u{i}@x.com", "subject": f"s{i}", "body": f"b{i}"})

    claimed = repo.claim_pending_tasks(limit=2)
    assert len(claimed) == 2

    remaining = repo.list_tasks(status="pending")
    assert len(remaining) == 3


def test_mark_succeeded(client: TestClient):
    repo = _repo(client)
    task = repo.enqueue_task("email_send", {"to": "a@b.com", "subject": "s", "body": "b"})
    claimed = repo.claim_pending_tasks()
    result = json.dumps({"provider": "smtp"})
    updated = repo.mark_task_succeeded(claimed[0].id, result)
    assert updated.status == "succeeded"
    assert updated.result == result


def test_mark_failed_goes_dead_after_max_attempts(client: TestClient):
    repo = _repo(client)
    task = repo.enqueue_task("email_send", {"to": "a@b.com", "subject": "s", "body": "b"}, max_attempts=2)

    # 第一次失败 → 回 pending
    claimed = repo.claim_pending_tasks()
    repo.mark_task_failed(claimed[0].id, "error 1", backoff_seconds=0)
    t = repo.get_task(task.id)
    assert t.status == "pending"
    assert t.attempts == 1

    # 第二次失败 → dead
    claimed = repo.claim_pending_tasks()
    repo.mark_task_failed(claimed[0].id, "error 2", backoff_seconds=0)
    t = repo.get_task(task.id)
    assert t.status == "dead"
    assert t.attempts == 2


def test_retry_task(client: TestClient):
    repo = _repo(client)
    task = repo.enqueue_task("email_send", {"to": "a@b.com", "subject": "s", "body": "b"}, max_attempts=1)
    claimed = repo.claim_pending_tasks()
    repo.mark_task_failed(claimed[0].id, "fatal", backoff_seconds=0)
    assert repo.get_task(task.id).status == "dead"

    repo.retry_task(task.id)
    assert repo.get_task(task.id).status == "pending"


def test_get_task_not_found(client: TestClient):
    repo = _repo(client)
    assert repo.get_task("nonexistent") is None


def test_enqueue_email_creates_outbox_and_task(client: TestClient):
    repo = _repo(client)
    email = repo.enqueue_email("test@example.com", "Subject", "Body", now_utc())

    # outbox 记录存在
    emails = repo.list_emails()
    assert any(e.id == email.id for e in emails)

    # 任务记录存在
    tasks = repo.list_tasks(task_type="email_send")
    assert len(tasks) >= 1
    task = next(t for t in tasks if t.payload.get("outbox_id") == email.id)
    assert task.payload["to"] == "test@example.com"
    assert task.payload["subject"] == "Subject"


def test_admin_tasks_api(client: TestClient, admin_headers: dict[str, str]):
    repo = _repo(client)
    repo.enqueue_task("email_send", {"to": "x@y.com", "subject": "s", "body": "b"})

    resp = client.get("/api/admin/tasks", headers=admin_headers)
    assert resp.status_code == 200
    tasks = resp.json()
    assert len(tasks) == 1
    assert tasks[0]["taskType"] == "email_send"

    task_id = tasks[0]["id"]
    resp = client.get(f"/api/admin/tasks/{task_id}", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == task_id


def test_admin_tasks_retry_api(client: TestClient, admin_headers: dict[str, str]):
    repo = _repo(client)
    task = repo.enqueue_task("email_send", {"to": "x@y.com", "subject": "s", "body": "b"}, max_attempts=1)
    claimed = repo.claim_pending_tasks()
    repo.mark_task_failed(claimed[0].id, "err", backoff_seconds=0)
    assert repo.get_task(task.id).status == "dead"

    resp = client.post(f"/api/admin/tasks/{task.id}/retry", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "pending"


def test_admin_tasks_filter_by_type_and_status(client: TestClient, admin_headers: dict[str, str]):
    repo = _repo(client)
    repo.enqueue_task("email_send", {"to": "a@b.com", "subject": "s", "body": "b"})
    repo.enqueue_task("email_send", {"to": "c@d.com", "subject": "s", "body": "b"})

    resp = client.get("/api/admin/tasks?type=email_send", headers=admin_headers)
    assert len(resp.json()) == 2

    resp = client.get("/api/admin/tasks?status=pending", headers=admin_headers)
    assert len(resp.json()) == 2

    resp = client.get("/api/admin/tasks?type=other", headers=admin_headers)
    assert len(resp.json()) == 0
