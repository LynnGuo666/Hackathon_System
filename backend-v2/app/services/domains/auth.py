import hashlib
import secrets
from datetime import timedelta
from email.utils import parseaddr

from app.core.errors import InvalidCode, InvalidEmail, TooManyAttempts
from app.core.security import normalize_email
from app.repositories.common import now_utc
from app.schemas import VerificationCode
from app.services import mailer


def hash_code(code: str) -> str:
    return hashlib.sha256(code.strip().encode()).hexdigest()


class AuthServiceMixin:
    def send_code(self, email: str) -> None:
        email = normalize_email(email)
        parsed_name, parsed_email = parseaddr(email)
        if parsed_name or parsed_email != email or "@" not in email:
            raise InvalidEmail("invalid email")
        now = now_utc()
        code = f"{secrets.randbelow(1_000_000):06d}"
        self.repository.upsert_verification_code(
            VerificationCode(
                email=email,
                code_hash=hash_code(code),
                expiresAt=now + timedelta(minutes=10),
                lastSentAt=now,
            )
        )
        self.repository.enqueue_email(
            email, mailer.verification_subject(), mailer.verification_body(code), now
        )

    def verify_code(self, email: str, code: str) -> None:
        email = normalize_email(email)
        verification = self.repository.get_verification_code(email)
        if not verification:
            raise InvalidCode("invalid or expired code")
        if verification.attempt_count >= 5:
            raise TooManyAttempts("too many verification attempts")
        now = now_utc()
        if (
            verification.used_at
            or now > verification.expires_at
            or verification.code_hash != hash_code(code)
        ):
            self.repository.increment_verification_attempt(email)
            raise InvalidCode("invalid or expired code")
        self.repository.mark_verification_used(email, now)
        self.repository.upsert_pre_event_participant(email, now)
