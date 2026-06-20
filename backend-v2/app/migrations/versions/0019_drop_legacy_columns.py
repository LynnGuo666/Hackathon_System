"""drop legacy resource/countdown columns

Revision ID: 0019_drop_legacy_columns
Revises: 0018_resource_claim_model
Create Date: 2026-06-20
"""

from alembic import op
import sqlalchemy as sa


revision = "0019_drop_legacy_columns"
down_revision = "0018_resource_claim_model"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # resource_pools: distribution_rule 已被 claim_mode 取代（0018 已迁移数据），
    # visible_phase 已废弃（后端不过滤、前端无 UI）。
    pool_columns = _resource_pool_columns()
    if "distribution_rule" in pool_columns:
        op.drop_column("resource_pools", "distribution_rule")
    if "visible_phase" in pool_columns:
        op.drop_column("resource_pools", "visible_phase")

    # site_config: countdown_title/countdown_end 已被 countdown_stages 取代
    # （0008 已把旧 countdown_end 转成 stage_legacy），前端只用 countdownStages。
    site_columns = _site_config_columns()
    if "countdown_title" in site_columns:
        op.drop_column("site_config", "countdown_title")
    if "countdown_end" in site_columns:
        op.drop_column("site_config", "countdown_end")


def downgrade() -> None:
    site_columns = _site_config_columns()
    if "countdown_end" not in site_columns:
        op.add_column(
            "site_config",
            sa.Column("countdown_end", sa.Text(), nullable=False, server_default=""),
        )
    if "countdown_title" not in site_columns:
        op.add_column(
            "site_config",
            sa.Column("countdown_title", sa.Text(), nullable=False, server_default=""),
        )

    pool_columns = _resource_pool_columns()
    if "visible_phase" not in pool_columns:
        op.add_column(
            "resource_pools",
            sa.Column("visible_phase", sa.Text(), nullable=False, server_default="all"),
        )
    if "distribution_rule" not in pool_columns:
        op.add_column(
            "resource_pools",
            sa.Column(
                "distribution_rule",
                sa.Text(),
                nullable=False,
                server_default="one_per_participant",
            ),
        )


def _resource_pool_columns() -> set[str]:
    connection = op.get_bind()
    rows = connection.exec_driver_sql("PRAGMA table_info(resource_pools)").fetchall()
    return {row[1] for row in rows}


def _site_config_columns() -> set[str]:
    connection = op.get_bind()
    rows = connection.exec_driver_sql("PRAGMA table_info(site_config)").fetchall()
    return {row[1] for row in rows}
