import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from app.core.errors import Conflict
from app.repositories.accommodation import AccommodationRepositoryMixin
from app.repositories.auth import AuthRepositoryMixin
from app.repositories.checkins import CheckinRepositoryMixin
from app.repositories.configuration import ConfigurationRepositoryMixin
from app.repositories.enrollments import EnrollmentRepositoryMixin
from app.repositories.meal_orders import MealOrderRepositoryMixin
from app.repositories.operations import OperationsRepositoryMixin
from app.repositories.participants import ParticipantRepositoryMixin
from app.repositories.plugins import PluginRepositoryMixin
from app.repositories.resources import ResourceRepositoryMixin
from app.repositories.tasks import TasksRepositoryMixin


class SQLiteRepository(
    AuthRepositoryMixin,
    CheckinRepositoryMixin,
    ParticipantRepositoryMixin,
    ResourceRepositoryMixin,
    OperationsRepositoryMixin,
    ConfigurationRepositoryMixin,
    AccommodationRepositoryMixin,
    MealOrderRepositoryMixin,
    EnrollmentRepositoryMixin,
    TasksRepositoryMixin,
    PluginRepositoryMixin,
):
    def __init__(self, path: str):
        self.path = path
        db_path = Path(path)
        if db_path.parent != Path("."):
            db_path.parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(path, check_same_thread=False, isolation_level=None)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA foreign_keys = ON")
        self.db.execute("PRAGMA busy_timeout = 5000")
        self.ensure_ready()

    def close(self) -> None:
        self.db.close()

    @contextmanager
    def tx(self) -> Iterator[sqlite3.Connection]:
        self.db.execute("BEGIN IMMEDIATE")
        try:
            yield self.db
        except Exception:
            self.db.rollback()
            raise
        else:
            self.db.commit()

    def ensure_ready(self) -> None:
        row = self.db.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'participants'"
        ).fetchone()
        if not row:
            raise RuntimeError("database is not migrated; run alembic upgrade head")

    def _constraint_error(self, error: sqlite3.IntegrityError) -> Conflict:
        message = str(error).lower()
        if "participants.email" in message:
            return Conflict("email is already bound")
        if "participants.checkin_id" in message:
            return Conflict("checkin id is already bound")
        if "resource_assignments" in message:
            return Conflict("resource already assigned to participant")
        if "resource_requests" in message:
            return Conflict("resource request already exists")
        return Conflict(f"sqlite constraint: {error}")
