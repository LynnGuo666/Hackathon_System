"""add async task framework

引入通用异步任务表 async_tasks 与加密凭据表 task_secrets。
async_tasks 由后台 worker 轮询消费，task_secrets 用 AES-256-GCM 加密存储敏感配置。

Revision ID: 0013_task_framework
Revises: 0012_walkup_checkin_config
Create Date: 2026-06-16
"""

from alembic import op
import sqlalchemy as sa


revision = "0013_task_framework"
down_revision = "0012_walkup_checkin_config"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "async_tasks",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("task_type", sa.Text(), nullable=False),
        sa.Column("payload", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_attempts", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("last_error", sa.Text()),
        sa.Column("result", sa.Text()),
        sa.Column("available_at", sa.Text(), nullable=False),
        sa.Column("locked_at", sa.Text()),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
    )
    # worker 按 (status, available_at) 轮询领取，加索引避免全表扫描。
    op.create_index(
        "idx_async_tasks_status_available",
        "async_tasks",
        ["status", "available_at"],
    )

    op.create_table(
        "task_secrets",
        sa.Column("key", sa.Text(), primary_key=True),
        sa.Column("ciphertext", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("task_secrets")
    op.drop_index("idx_async_tasks_status_available", table_name="async_tasks")
    op.drop_table("async_tasks")
