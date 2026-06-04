"""add event basics and staged countdown

Revision ID: 0008_site_config_basics
Revises: 0007_countdown_feature_link
Create Date: 2026-06-04
"""

from alembic import op
import sqlalchemy as sa


revision = "0008_site_config_basics"
down_revision = "0007_countdown_feature_link"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "site_config",
        sa.Column("event_name", sa.Text(), nullable=False, server_default="Hackathon"),
    )
    op.add_column(
        "site_config",
        sa.Column("timezone", sa.Text(), nullable=False, server_default="Asia/Shanghai"),
    )
    op.add_column(
        "site_config",
        sa.Column("countdown_stages", sa.Text(), nullable=False, server_default="[]"),
    )
    op.execute(
        """
UPDATE site_config
SET countdown_stages = json_array(
  json_object(
    'id', 'stage_legacy',
    'label', CASE WHEN countdown_title = '' THEN '开赛' ELSE countdown_title END,
    'time', countdown_end
  )
)
WHERE countdown_end <> ''
  AND (countdown_stages = '' OR countdown_stages = '[]')
"""
    )


def downgrade() -> None:
    op.drop_column("site_config", "countdown_stages")
    op.drop_column("site_config", "timezone")
    op.drop_column("site_config", "event_name")
