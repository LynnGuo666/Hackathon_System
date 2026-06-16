"""add walkup checkin config

Revision ID: 0012_walkup_checkin_config
Revises: 0011_drop_feature_links
Create Date: 2026-06-14
"""

from alembic import op
import sqlalchemy as sa


revision = "0012_walkup_checkin_config"
down_revision = "0011_drop_feature_links"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if "walkup_checkin_enabled" not in _site_config_columns():
        op.add_column(
            "site_config",
            sa.Column("walkup_checkin_enabled", sa.Integer(), nullable=False, server_default="0"),
        )


def downgrade() -> None:
    if "walkup_checkin_enabled" in _site_config_columns():
        op.drop_column("site_config", "walkup_checkin_enabled")


def _site_config_columns() -> set[str]:
    connection = op.get_bind()
    rows = connection.exec_driver_sql("PRAGMA table_info(site_config)").fetchall()
    return {row[1] for row in rows}
