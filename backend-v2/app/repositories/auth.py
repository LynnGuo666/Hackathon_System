from datetime import datetime
import sqlite3

from app.core.security import normalize_email
from app.repositories.common import decode_time, encode_time
from app.schemas import VerificationCode


class AuthRepositoryMixin:
    db: sqlite3.Connection

    def upsert_verification_code(self, code: VerificationCode) -> None:
        self.db.execute(
            """
INSERT INTO email_verification_codes (email, code_hash, expires_at, used_at, attempt_count, last_sent_at)
VALUES (?, ?, ?, NULL, ?, ?)
ON CONFLICT(email) DO UPDATE SET
  code_hash = excluded.code_hash,
  expires_at = excluded.expires_at,
  used_at = NULL,
  attempt_count = excluded.attempt_count,
  last_sent_at = excluded.last_sent_at
""",
            (
                normalize_email(code.email),
                code.code_hash,
                encode_time(code.expires_at),
                code.attempt_count,
                encode_time(code.last_sent_at),
            ),
        )

    def get_verification_code(self, email: str) -> VerificationCode | None:
        row = self.db.execute(
            """
SELECT email, code_hash, expires_at, COALESCE(used_at, '') used_at, attempt_count, last_sent_at
FROM email_verification_codes WHERE email = ?
""",
            (normalize_email(email),),
        ).fetchone()
        if not row:
            return None
        return VerificationCode(
            email=row["email"],
            code_hash=row["code_hash"],
            expiresAt=decode_time(row["expires_at"]),
            usedAt=decode_time(row["used_at"]),
            attemptCount=row["attempt_count"],
            lastSentAt=decode_time(row["last_sent_at"]),
        )

    def mark_verification_used(self, email: str, used_at: datetime) -> None:
        self.db.execute(
            "UPDATE email_verification_codes SET used_at = ? WHERE email = ?",
            (encode_time(used_at), normalize_email(email)),
        )

    def increment_verification_attempt(self, email: str) -> None:
        self.db.execute(
            "UPDATE email_verification_codes SET attempt_count = attempt_count + 1 WHERE email = ?",
            (normalize_email(email),),
        )
