"""add meal order and drink supply windows

Revision ID: 0005_meal_orders
Revises: 0004_resource_pool_claims
Create Date: 2026-06-02
"""

from alembic import op
import sqlalchemy as sa


revision = "0005_meal_orders"
down_revision = "0004_resource_pool_claims"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "meal_order_slots",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("open_at", sa.Text(), nullable=False),
        sa.Column("close_at", sa.Text(), nullable=False),
        sa.Column("service_date", sa.Text(), nullable=False, server_default=""),
        sa.Column("service_time", sa.Text(), nullable=False, server_default=""),
        sa.Column("order_deadline", sa.Text(), nullable=False, server_default=""),
        sa.Column("is_open", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("dietary_options", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("enabled", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
    )
    op.create_table(
        "drink_supply_slots",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("open_at", sa.Text(), nullable=False),
        sa.Column("close_at", sa.Text(), nullable=False),
        sa.Column("service_date", sa.Text(), nullable=False, server_default=""),
        sa.Column("service_time", sa.Text(), nullable=False, server_default=""),
        sa.Column("order_deadline", sa.Text(), nullable=False, server_default=""),
        sa.Column("is_open", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("drink_options", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("enabled", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
    )
    op.create_table(
        "meal_orders",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column(
            "email",
            sa.Text(),
            sa.ForeignKey("participants.email", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("slot_id", sa.Text(), sa.ForeignKey("meal_order_slots.id"), nullable=False),
        sa.Column("dietary_needs", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("other_detail", sa.Text(), nullable=False, server_default=""),
        sa.Column("notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.UniqueConstraint("email", "slot_id"),
    )
    op.create_table(
        "drink_orders",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column(
            "email",
            sa.Text(),
            sa.ForeignKey("participants.email", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("slot_id", sa.Text(), sa.ForeignKey("drink_supply_slots.id"), nullable=False),
        sa.Column("drink_option", sa.Text(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.UniqueConstraint("email", "slot_id"),
    )
    op.execute(
        """
INSERT INTO feature_links (id, title, description, url, enabled, sort_order, created_at, updated_at)
VALUES ('feat_meal_order', '餐饮补给', '提交餐食忌口和饮料补给需求', '/p/meal-order', 1, 25, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT(id) DO NOTHING
"""
    )


def downgrade() -> None:
    op.execute("DELETE FROM feature_links WHERE id = 'feat_meal_order'")
    op.drop_table("drink_orders")
    op.drop_table("meal_orders")
    op.drop_table("drink_supply_slots")
    op.drop_table("meal_order_slots")
