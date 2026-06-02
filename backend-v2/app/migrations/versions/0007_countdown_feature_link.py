"""add countdown feature link

Revision ID: 0007_countdown_feature_link
Revises: 0006_checkin_ids
Create Date: 2026-06-03
"""

from alembic import op


revision = "0007_countdown_feature_link"
down_revision = "0006_checkin_ids"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
INSERT INTO feature_links (id, title, description, url, enabled, sort_order, created_at, updated_at)
VALUES ('feat_countdown', '倒计时', '', '/p/dashboard', 1, 45, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT(id) DO NOTHING
"""
    )


def downgrade() -> None:
    op.execute("DELETE FROM feature_links WHERE id = 'feat_countdown'")
