"""resource claim model refactor

Revision ID: 0018_resource_claim_model
Revises: 0017_resource_docs
Create Date: 2026-06-20
"""

from alembic import op
import sqlalchemy as sa


revision = "0018_resource_claim_model"
down_revision = "0017_resource_docs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # resource_pools: 新增领取方式三字段，保留旧 distribution_rule 列向后兼容。
    if "claim_mode" not in _resource_pool_columns():
        op.add_column(
            "resource_pools",
            sa.Column("claim_mode", sa.Text(), nullable=False, server_default="self_claim"),
        )
    if "require_review" not in _resource_pool_columns():
        op.add_column(
            "resource_pools",
            sa.Column("require_review", sa.Integer(), nullable=False, server_default="0"),
        )
    if "allowed_tags" not in _resource_pool_columns():
        op.add_column(
            "resource_pools",
            sa.Column("allowed_tags", sa.Text(), nullable=False, server_default="[]"),
        )

    # 旧 distribution_rule → claim_mode 映射；参照 0004 的 op.execute 范式。
    op.execute(
        """
UPDATE resource_pools
SET claim_mode = CASE distribution_rule
    WHEN 'manual' THEN 'admin_only'
    WHEN 'role_based' THEN 'self_claim'
    ELSE 'self_claim'
END
WHERE claim_mode = 'self_claim'
  AND distribution_rule IS NOT NULL
  AND distribution_rule != ''
"""
    )

    # site_config: 两系统开关，默认开启（迁移后行为不变）。
    site_columns = _site_config_columns()
    if "enrollment_review_enabled" not in site_columns:
        op.add_column(
            "site_config",
            sa.Column(
                "enrollment_review_enabled", sa.Integer(), nullable=False, server_default="1"
            ),
        )
    if "checkin_enabled" not in site_columns:
        op.add_column(
            "site_config",
            sa.Column("checkin_enabled", sa.Integer(), nullable=False, server_default="1"),
        )

    # 选手 tag：解耦于报名/签到，由审核通过/签到触发自动打。
    op.create_table(
        "participant_tags",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("checkin_id", sa.Text(), nullable=True),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("tag", sa.Text(), nullable=False),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.UniqueConstraint("email", "tag", name="uq_participant_tags_email_tag"),
    )
    op.create_index("ix_participant_tags_checkin_id", "participant_tags", ["checkin_id"])

    # 资源申请审核记录：pending 不分配 item，批准才分配并回填 assignment_id。
    op.create_table(
        "resource_requests",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("pool_id", sa.Text(), sa.ForeignKey("resource_pools.id"), nullable=False),
        sa.Column("checkin_id", sa.Text(), sa.ForeignKey("participants.checkin_id"), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("resource_item_id", sa.Text(), nullable=True),
        sa.Column("assignment_id", sa.Text(), nullable=True),
        sa.Column("reviewer", sa.Text(), nullable=False, server_default=""),
        sa.Column("review_note", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("reviewed_at", sa.Text(), nullable=True),
    )
    op.create_index(
        "ix_resource_requests_pool_status", "resource_requests", ["pool_id", "status"]
    )


def downgrade() -> None:
    op.drop_index("ix_resource_requests_pool_status", table_name="resource_requests")
    op.drop_table("resource_requests")
    op.drop_index("ix_participant_tags_checkin_id", table_name="participant_tags")
    op.drop_table("participant_tags")

    site_columns = _site_config_columns()
    if "checkin_enabled" in site_columns:
        op.drop_column("site_config", "checkin_enabled")
    if "enrollment_review_enabled" in site_columns:
        op.drop_column("site_config", "enrollment_review_enabled")

    pool_columns = _resource_pool_columns()
    if "allowed_tags" in pool_columns:
        op.drop_column("resource_pools", "allowed_tags")
    if "require_review" in pool_columns:
        op.drop_column("resource_pools", "require_review")
    if "claim_mode" in pool_columns:
        op.drop_column("resource_pools", "claim_mode")


def _resource_pool_columns() -> set[str]:
    connection = op.get_bind()
    rows = connection.exec_driver_sql("PRAGMA table_info(resource_pools)").fetchall()
    return {row[1] for row in rows}


def _site_config_columns() -> set[str]:
    connection = op.get_bind()
    rows = connection.exec_driver_sql("PRAGMA table_info(site_config)").fetchall()
    return {row[1] for row in rows}
