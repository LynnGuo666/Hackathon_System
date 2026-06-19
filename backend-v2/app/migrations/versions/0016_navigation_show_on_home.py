"""add show_on_home column to navigation_links

Revision ID: 0016_navigation_show_on_home
Revises: 0015_plugin_system
Create Date: 2026-06-18
"""

from alembic import op
import sqlalchemy as sa


revision = "0016_navigation_show_on_home"
down_revision = "0015_plugin_system"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if "show_on_home" not in _navigation_columns():
        op.add_column(
            "navigation_links",
            sa.Column("show_on_home", sa.Integer(), nullable=False, server_default="0"),
        )


def downgrade() -> None:
    if "show_on_home" in _navigation_columns():
        op.drop_column("navigation_links", "show_on_home")


def _navigation_columns() -> set[str]:
    connection = op.get_bind()
    rows = connection.exec_driver_sql("PRAGMA table_info(navigation_links)").fetchall()
    return {row[1] for row in rows}
