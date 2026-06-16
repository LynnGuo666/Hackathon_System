from datetime import datetime
import json
import sqlite3
from typing import Any

from app.core.errors import NotFound
from app.core import secrets as secret_store
from app.repositories.common import decode_time, encode_time, new_id, now_utc
from app.schemas import AsyncTask, TaskStatus


class TasksRepositoryMixin:
    db: sqlite3.Connection

    def enqueue_task(
        self,
        task_type: str,
        payload: dict[str, Any],
        *,
        max_attempts: int = 3,
        available_at: datetime | None = None,
    ) -> AsyncTask:
        """入队一个异步任务，立即返回 pending 状态的任务对象。"""
        now = now_utc()
        task = AsyncTask(
            id=new_id("task"),
            taskType=task_type,
            payload=payload,
            status=TaskStatus.pending,
            maxAttempts=max_attempts,
            availableAt=available_at or now,
            createdAt=now,
            updatedAt=now,
        )
        self.db.execute(
            """
INSERT INTO async_tasks
  (id, task_type, payload, status, attempts, max_attempts, last_error, result,
   available_at, locked_at, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, NULL, ?, ?)
""",
            (
                task.id,
                task.task_type,
                json.dumps(task.payload, ensure_ascii=False),
                task.status,
                task.attempts,
                task.max_attempts,
                encode_time(task.available_at),
                encode_time(task.created_at),
                encode_time(task.updated_at),
            ),
        )
        return task

    def claim_pending_tasks(self, limit: int = 10) -> list[AsyncTask]:
        """原子地领取一批 pending 且到期的任务，置为 sending。

        用 BEGIN IMMEDIATE 串行化写，配合 busy_timeout 防止多 worker 双发。
        """
        now = now_utc()
        now_text = encode_time(now)
        with self.tx() as conn:
            rows = conn.execute(
                """
SELECT id FROM async_tasks
WHERE status = ? AND available_at <= ?
ORDER BY available_at ASC
LIMIT ?
""",
                (TaskStatus.pending, now_text, limit),
            ).fetchall()
            ids = [row["id"] for row in rows]
            if not ids:
                return []
            placeholders = ",".join("?" for _ in ids)
            conn.execute(
                f"""
UPDATE async_tasks
SET status = ?, locked_at = ?, updated_at = ?
WHERE id IN ({placeholders})
""",
                [TaskStatus.sending, now_text, now_text, *ids],
            )
            claimed = conn.execute(
                f"""
SELECT id, task_type, payload, status, attempts, max_attempts,
       COALESCE(last_error, '') last_error, COALESCE(result, '') result,
       available_at, locked_at, created_at, updated_at
FROM async_tasks
WHERE id IN ({placeholders})
ORDER BY available_at ASC
""",
                ids,
            ).fetchall()
        return [_row_to_task(row) for row in claimed]

    def mark_task_succeeded(self, task_id: str, result: str) -> AsyncTask:
        now = now_utc()
        self.db.execute(
            """
UPDATE async_tasks
SET status = ?, result = ?, last_error = NULL, updated_at = ?
WHERE id = ?
""",
            (TaskStatus.succeeded, result, encode_time(now), task_id),
        )
        return self._get_task_or_raise(task_id)

    def mark_task_failed(self, task_id: str, error: str, *, backoff_seconds: int) -> AsyncTask:
        """记录失败：达到 max_attempts 则 dead，否则回 pending 并推迟 available_at。"""
        now = now_utc()
        with self.tx() as conn:
            row = conn.execute(
                "SELECT attempts, max_attempts FROM async_tasks WHERE id = ?",
                (task_id,),
            ).fetchone()
            if not row:
                raise NotFound("task not found")
            attempts = row["attempts"] + 1
            max_attempts = row["max_attempts"]
            if attempts >= max_attempts:
                conn.execute(
                    """
UPDATE async_tasks
SET status = ?, attempts = ?, last_error = ?, updated_at = ?
WHERE id = ?
""",
                    (TaskStatus.dead, attempts, error, encode_time(now), task_id),
                )
            else:
                available_at = now.timestamp() + backoff_seconds
                from datetime import datetime as _dt
                from datetime import UTC as _UTC

                next_run = _dt.fromtimestamp(available_at, tz=_UTC)
                conn.execute(
                    """
UPDATE async_tasks
SET status = ?, attempts = ?, last_error = ?, available_at = ?, locked_at = NULL, updated_at = ?
WHERE id = ?
""",
                    (
                        TaskStatus.pending,
                        attempts,
                        error,
                        encode_time(next_run),
                        encode_time(now),
                        task_id,
                    ),
                )
        return self._get_task_or_raise(task_id)

    def retry_task(self, task_id: str) -> AsyncTask:
        """手动重置任务为 pending（管理员触发的重试）。"""
        now = now_utc()
        result = self.db.execute(
            """
UPDATE async_tasks
SET status = ?, last_error = NULL, locked_at = NULL, available_at = ?, updated_at = ?
WHERE id = ? AND status != ?
""",
            (TaskStatus.pending, encode_time(now), encode_time(now), task_id, TaskStatus.succeeded),
        )
        if result.rowcount == 0:
            raise NotFound("task not found or already succeeded")
        return self._get_task_or_raise(task_id)

    def list_tasks(
        self,
        *,
        task_type: str | None = None,
        status: str | None = None,
        limit: int = 100,
    ) -> list[AsyncTask]:
        query = """
SELECT id, task_type, payload, status, attempts, max_attempts,
       COALESCE(last_error, '') last_error, COALESCE(result, '') result,
       available_at, locked_at, created_at, updated_at
FROM async_tasks
"""
        conditions: list[str] = []
        params: list[Any] = []
        if task_type:
            conditions.append("task_type = ?")
            params.append(task_type)
        if status:
            conditions.append("status = ?")
            params.append(status)
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)
        rows = self.db.execute(query, params).fetchall()
        return [_row_to_task(row) for row in rows]

    def get_task(self, task_id: str) -> AsyncTask | None:
        row = self.db.execute(
            """
SELECT id, task_type, payload, status, attempts, max_attempts,
       COALESCE(last_error, '') last_error, COALESCE(result, '') result,
       available_at, locked_at, created_at, updated_at
FROM async_tasks
WHERE id = ?
""",
            (task_id,),
        ).fetchone()
        return _row_to_task(row) if row else None

    def _get_task_or_raise(self, task_id: str) -> AsyncTask:
        task = self.get_task(task_id)
        if not task:
            raise NotFound("task not found")
        return task

    # ---- 加密凭据（task_secrets 表）----

    def set_secret(self, key: str, value: str) -> None:
        """加密存储凭据；空值则删除该 key。"""
        now = now_utc()
        if not value:
            self.db.execute("DELETE FROM task_secrets WHERE key = ?", (key,))
            return
        ciphertext = secret_store.encrypt(value)
        self.db.execute(
            """
INSERT INTO task_secrets (key, ciphertext, updated_at)
VALUES (?, ?, ?)
ON CONFLICT(key) DO UPDATE SET ciphertext = excluded.ciphertext, updated_at = excluded.updated_at
""",
            (key, ciphertext, encode_time(now)),
        )

    def get_secret(self, key: str) -> str:
        """解密读取凭据；不存在或为空返回空串。"""
        row = self.db.execute(
            "SELECT ciphertext FROM task_secrets WHERE key = ?",
            (key,),
        ).fetchone()
        if not row:
            return ""
        return secret_store.decrypt(row["ciphertext"])

    def list_secret_keys(self) -> list[str]:
        rows = self.db.execute(
            "SELECT key FROM task_secrets ORDER BY key ASC"
        ).fetchall()
        return [row["key"] for row in rows]

    def delete_secret(self, key: str) -> None:
        self.db.execute("DELETE FROM task_secrets WHERE key = ?", (key,))


def _row_to_task(row: sqlite3.Row) -> AsyncTask:
    try:
        payload = json.loads(row["payload"]) if row["payload"] else {}
    except json.JSONDecodeError:
        payload = {}
    return AsyncTask(
        id=row["id"],
        taskType=row["task_type"],
        payload=payload,
        status=row["status"],
        attempts=row["attempts"],
        maxAttempts=row["max_attempts"],
        lastError=row["last_error"],
        result=row["result"],
        availableAt=decode_time(row["available_at"]),
        lockedAt=decode_time(row["locked_at"]),
        createdAt=decode_time(row["created_at"]),
        updatedAt=decode_time(row["updated_at"]),
    )
