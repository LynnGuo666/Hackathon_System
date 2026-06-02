"""add checkin id pool

Revision ID: 0006_checkin_ids
Revises: 0005_meal_orders
Create Date: 2026-06-03
"""

from alembic import op
import sqlalchemy as sa


revision = "0006_checkin_ids"
down_revision = "0005_meal_orders"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "checkin_ids",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("status", sa.Text(), nullable=False, server_default="available"),
        sa.Column("assigned_email", sa.Text(), sa.ForeignKey("participants.email", ondelete="SET NULL")),
        sa.Column("bound_at", sa.Text()),
        sa.Column("created_at", sa.Text(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("checkin_ids")
