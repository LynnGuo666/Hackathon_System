"""add enrollment feature link

Revision ID: 0010_enrollment_feature_link
Revises: 0009_enrollment
Create Date: 2026-06-11
"""

from alembic import op


revision = "0010_enrollment_feature_link"
down_revision = "0009_enrollment"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
INSERT INTO feature_links (id, title, description, url, enabled, sort_order, created_at, updated_at)
VALUES ('feat_enrollment', '报名', '提交参赛报名信息', '/p/enrollment', 1, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT(id) DO NOTHING
"""
    )


def downgrade() -> None:
    op.execute("DELETE FROM feature_links WHERE id = 'feat_enrollment'")
