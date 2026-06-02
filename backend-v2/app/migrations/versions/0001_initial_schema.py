"""initial schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-06-02
"""

from alembic import op
import sqlalchemy as sa


revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "participants",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("checkin_id", sa.Text(), unique=True),
        sa.Column("email", sa.Text(), nullable=False, unique=True),
        sa.Column("email_verified_at", sa.Text(), nullable=False),
        sa.Column("checked_in_at", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
    )
    op.create_table(
        "participant_profiles",
        sa.Column(
            "email",
            sa.Text(),
            sa.ForeignKey("participants.email", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("full_name", sa.Text(), nullable=False),
        sa.Column("team_name", sa.Text(), nullable=False),
        sa.Column("school", sa.Text(), nullable=False),
        sa.Column("phone", sa.Text(), nullable=False),
        sa.Column("dietary_needs", sa.Text(), nullable=False),
        sa.Column("tshirt_size", sa.Text(), nullable=False),
        sa.Column("emergency_contact", sa.Text(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("submitted_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
    )
    op.create_table(
        "email_verification_codes",
        sa.Column("email", sa.Text(), primary_key=True),
        sa.Column("code_hash", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.Text(), nullable=False),
        sa.Column("used_at", sa.Text()),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_sent_at", sa.Text(), nullable=False),
    )
    op.create_table(
        "resource_pools",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("type", sa.Text(), nullable=False),
        sa.Column("distribution_rule", sa.Text(), nullable=False),
        sa.Column("visible_phase", sa.Text(), nullable=False),
        sa.Column("enabled", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.Text(), nullable=False),
    )
    op.create_table(
        "resource_items",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("pool_id", sa.Text(), sa.ForeignKey("resource_pools.id"), nullable=False),
        sa.Column("code_ciphertext", sa.Text(), nullable=False),
        sa.Column("public_label", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("assigned_checkin_id", sa.Text(), sa.ForeignKey("participants.checkin_id")),
        sa.Column("assigned_at", sa.Text()),
        sa.Column("expires_at", sa.Text()),
    )
    op.create_table(
        "resource_assignments",
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
    op.create_table(
        "email_outbox",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("recipient", sa.Text(), nullable=False),
        sa.Column("subject", sa.Text(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_error", sa.Text()),
        sa.Column("sent_at", sa.Text()),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
    )
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("actor_id", sa.Text(), nullable=False),
        sa.Column("action", sa.Text(), nullable=False),
        sa.Column("target_type", sa.Text(), nullable=False),
        sa.Column("target_id", sa.Text(), nullable=False),
        sa.Column("reason", sa.Text()),
        sa.Column("created_at", sa.Text(), nullable=False),
    )
    op.create_table(
        "navigation_links",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("enabled", sa.Integer(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
    )
    op.create_table(
        "site_config",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("countdown_title", sa.Text(), nullable=False, server_default=""),
        sa.Column("countdown_end", sa.Text(), nullable=False, server_default=""),
        sa.Column("countdown_enabled", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.Text(), nullable=False),
    )
    op.create_table(
        "accommodation_requests",
        sa.Column(
            "email",
            sa.Text(),
            sa.ForeignKey("participants.email", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("selections", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("other_detail", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
    )

    op.execute(
        """
INSERT INTO navigation_links (id, title, description, url, enabled, sort_order, created_at, updated_at)
VALUES
('nav_profile', '我的资料', '补全赛前信息和联系方式', '/p/profile', 1, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('nav_accommodation', '住宿需求', '填写你的住宿偏好和需求', '/p/accommodation', 1, 15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('nav_identity', '签到身份', '现场绑定 CheckinID', '/p/identity', 1, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('nav_resources', '我的资源', '查看已领取的兑换码和物资', '/p/resources', 1, 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('nav_dashboard', '总览', '返回选手服务工作台', '/p/dashboard', 1, 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
"""
    )
    op.execute(
        """
INSERT INTO site_config (id, countdown_title, countdown_end, countdown_enabled, updated_at)
VALUES ('default', '', '', 0, CURRENT_TIMESTAMP)
"""
    )


def downgrade() -> None:
    op.drop_table("accommodation_requests")
    op.drop_table("site_config")
    op.drop_table("navigation_links")
    op.drop_table("audit_logs")
    op.drop_table("email_outbox")
    op.drop_table("resource_assignments")
    op.drop_table("resource_items")
    op.drop_table("resource_pools")
    op.drop_table("email_verification_codes")
    op.drop_table("participant_profiles")
    op.drop_table("participants")
