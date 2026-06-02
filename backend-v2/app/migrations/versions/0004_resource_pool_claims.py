"""add resource pool repeated claim setting

Revision ID: 0004_resource_pool_claims
Revises: 0003_event_location
Create Date: 2026-06-02
"""

from alembic import op
import sqlalchemy as sa


revision = "0004_resource_pool_claims"
down_revision = "0003_event_location"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "resource_pools",
        sa.Column("allow_multiple_claims", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_table(
        "resource_assignments_new",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("checkin_id", sa.Text(), sa.ForeignKey("participants.checkin_id"), nullable=False),
        sa.Column("pool_id", sa.Text(), sa.ForeignKey("resource_pools.id"), nullable=False),
        sa.Column("resource_item_id", sa.Text(), sa.ForeignKey("resource_items.id"), nullable=False, unique=True),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("delivered_by_email", sa.Integer(), nullable=False),
        sa.Column("delivered_at", sa.Text()),
        sa.Column("created_at", sa.Text(), nullable=False),
    )
    op.execute(
        """
INSERT INTO resource_assignments_new (
    id, checkin_id, pool_id, resource_item_id, status, delivered_by_email, delivered_at, created_at
)
SELECT id, checkin_id, pool_id, resource_item_id, status, delivered_by_email, delivered_at, created_at
FROM resource_assignments
"""
    )
    op.drop_table("resource_assignments")
    op.rename_table("resource_assignments_new", "resource_assignments")


def downgrade() -> None:
    op.create_table(
        "resource_assignments_old",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("checkin_id", sa.Text(), sa.ForeignKey("participants.checkin_id"), nullable=False),
        sa.Column("pool_id", sa.Text(), sa.ForeignKey("resource_pools.id"), nullable=False),
        sa.Column("resource_item_id", sa.Text(), sa.ForeignKey("resource_items.id"), nullable=False, unique=True),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("delivered_by_email", sa.Integer(), nullable=False),
        sa.Column("delivered_at", sa.Text()),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.UniqueConstraint("checkin_id", "pool_id"),
    )
    op.execute(
        """
INSERT INTO resource_assignments_old (
    id, checkin_id, pool_id, resource_item_id, status, delivered_by_email, delivered_at, created_at
)
SELECT id, checkin_id, pool_id, resource_item_id, status, delivered_by_email, delivered_at, created_at
FROM resource_assignments
GROUP BY checkin_id, pool_id
"""
    )
    op.drop_table("resource_assignments")
    op.rename_table("resource_assignments_old", "resource_assignments")
    op.drop_column("resource_pools", "allow_multiple_claims")
