from datetime import datetime
import sqlite3
from typing import TYPE_CHECKING

from app.core.errors import NotFound
from app.core.security import normalize_email
from app.repositories.common import decode_time, encode_time, new_id
from app.schemas import AuditLog, EmailOutbox, EmailStatus

if TYPE_CHECKING:
    from app.repositories.tasks import TasksRepositoryMixin


class OperationsRepositoryMixin:
    db: sqlite3.Connection

    def enqueue_email(self: "OperationsRepositoryMixin & TasksRepositoryMixin", to: str, subject: str, body: str, now: datetime) -> EmailOutbox:
        email = EmailOutbox(
            id=new_id("mail"),
            to=normalize_email(to),
            subject=subject,
            body=body,
            status=EmailStatus.pending,
            createdAt=now,
            updatedAt=now,
        )
        self.db.execute(
            """
INSERT INTO email_outbox (id, recipient, subject, body, status, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?)
""",
            (
                email.id,
                email.to,
                email.subject,
                email.body,
                email.status,
                encode_time(now),
                encode_time(now),
            ),
        )
        self.enqueue_task(
            "email_send",
            {"outbox_id": email.id, "to": email.to, "subject": subject, "body": body},
        )
        return email

    def list_emails(self) -> list[EmailOutbox]:
        rows = self.db.execute(
            """
SELECT id, recipient, subject, body, status, retry_count, COALESCE(last_error, '') last_error,
       COALESCE(sent_at, '') sent_at, created_at, updated_at
FROM email_outbox ORDER BY created_at ASC
"""
        ).fetchall()
        return [
            EmailOutbox(
                id=row["id"],
                to=row["recipient"],
                subject=row["subject"],
                body=row["body"],
                status=row["status"],
                retryCount=row["retry_count"],
                lastError=row["last_error"],
                sentAt=decode_time(row["sent_at"]),
                createdAt=decode_time(row["created_at"]),
                updatedAt=decode_time(row["updated_at"]),
            )
            for row in rows
        ]

    def retry_email(self, email_id: str, now: datetime) -> EmailOutbox:
        result = self.db.execute(
            """
UPDATE email_outbox
SET status = ?, retry_count = retry_count + 1, last_error = NULL, updated_at = ?
WHERE id = ? AND status != ?
""",
            (EmailStatus.pending, encode_time(now), email_id, EmailStatus.sent),
        )
        if result.rowcount == 0:
            raise NotFound("not found")
        for email in self.list_emails():
            if email.id == email_id:
                return email
        raise NotFound("not found")

    def mark_email_sent(self, email_id: str, now: datetime) -> None:
        """回写 email_outbox 状态为已发送（由 email_send task handler 调用）。"""
        self.db.execute(
            """
UPDATE email_outbox
SET status = ?, sent_at = ?, updated_at = ?
WHERE id = ?
""",
            (EmailStatus.sent, encode_time(now), encode_time(now), email_id),
        )

    def record_audit(
        self, actor_id: str, action: str, target_type: str, target_id: str, reason: str, now: datetime
    ) -> AuditLog:
        log = AuditLog(
            id=new_id("aud"),
            actorId=actor_id,
            action=action,
            targetType=target_type,
            targetId=target_id,
            reason=reason,
            createdAt=now,
        )
        self.db.execute(
            """
INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, reason, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?)
""",
            (log.id, log.actor_id, log.action, log.target_type, log.target_id, log.reason, encode_time(now)),
        )
        return log

    def list_audits(self) -> list[AuditLog]:
        rows = self.db.execute(
            """
SELECT id, actor_id, action, target_type, target_id, COALESCE(reason, '') reason, created_at
FROM audit_logs ORDER BY created_at ASC
"""
        ).fetchall()
        return [
            AuditLog(
                id=row["id"],
                actorId=row["actor_id"],
                action=row["action"],
                targetType=row["target_type"],
                targetId=row["target_id"],
                reason=row["reason"],
                createdAt=decode_time(row["created_at"]),
            )
            for row in rows
        ]
