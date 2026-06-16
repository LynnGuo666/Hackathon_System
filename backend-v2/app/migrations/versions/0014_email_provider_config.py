"""add email provider configuration columns

在 site_config 表新增邮件 provider 相关明文配置列。
凭据（smtp_password、email_service_api_key）走 task_secrets 表（AES 加密），不在此迁移。

Revision ID: 0014_email_provider_config
Revises: 0013_task_framework
Create Date: 2026-06-16
"""

from alembic import op
import sqlalchemy as sa


revision = "0014_email_provider_config"
down_revision = "0013_task_framework"
branch_labels = None
depends_on = None


def _guarded_add_column(table: str, column: sa.Column) -> None:
    """安全加列：列已存在时跳过，避免重复迁移报错。"""
    conn = op.get_bind()
    result = conn.execute(sa.text(f"PRAGMA table_info({table})"))
    existing = {row[1] for row in result}
    if column.name not in existing:
        op.add_column(table, column)


def upgrade() -> None:
    _guarded_add_column("site_config", sa.Column("email_provider", sa.Text(), server_default="disabled"))
    _guarded_add_column("site_config", sa.Column("email_service_url", sa.Text(), server_default=""))
    _guarded_add_column("site_config", sa.Column("email_service_account_id", sa.Text(), server_default=""))
    _guarded_add_column("site_config", sa.Column("email_service_sync", sa.Integer(), server_default="0"))
    _guarded_add_column("site_config", sa.Column("smtp_host", sa.Text(), server_default=""))
    _guarded_add_column("site_config", sa.Column("smtp_port", sa.Integer(), server_default="587"))
    _guarded_add_column("site_config", sa.Column("smtp_username", sa.Text(), server_default=""))
    _guarded_add_column("site_config", sa.Column("smtp_from", sa.Text(), server_default=""))
    _guarded_add_column("site_config", sa.Column("smtp_security", sa.Text(), server_default="starttls"))


def downgrade() -> None:
    for col in [
        "email_provider", "email_service_url", "email_service_account_id",
        "email_service_sync", "smtp_host", "smtp_port", "smtp_username",
        "smtp_from", "smtp_security",
    ]:
        op.drop_column("site_config", col)
