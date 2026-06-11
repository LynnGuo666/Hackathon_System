"""drop feature_links table

Revision ID: 0011_drop_feature_links
Revises: 0010_enrollment_feature_link
Create Date: 2026-06-11
"""

from alembic import op


revision = "0011_drop_feature_links"
down_revision = "0010_enrollment_feature_link"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("DELETE FROM feature_links")
    op.drop_table("feature_links")


def downgrade() -> None:
    op.create_table(
        "feature_links",
        op.Column("id", op.Text(), primary_key=True),
        op.Column("title", op.Text(), nullable=False),
        op.Column("description", op.Text(), nullable=False),
        op.Column("url", op.Text(), nullable=False),
        op.Column("enabled", op.Integer(), nullable=False),
        op.Column("sort_order", op.Integer(), nullable=False),
        op.Column("created_at", op.Text(), nullable=False),
        op.Column("updated_at", op.Text(), nullable=False),
    )
