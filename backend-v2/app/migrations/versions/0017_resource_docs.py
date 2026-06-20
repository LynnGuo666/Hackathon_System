"""add doc fields to resource pools and items

Revision ID: 0017_resource_docs
Revises: 0016_navigation_show_on_home
Create Date: 2026-06-20
"""

from alembic import op
import sqlalchemy as sa


revision = "0017_resource_docs"
down_revision = "0016_navigation_show_on_home"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "resource_pools",
        sa.Column("doc_url", sa.Text(), nullable=False, server_default=""),
    )
    op.add_column(
        "resource_pools",
        sa.Column("doc_markdown", sa.Text(), nullable=False, server_default=""),
    )
    op.add_column(
        "resource_items",
        sa.Column("doc_url", sa.Text(), nullable=False, server_default=""),
    )
    op.add_column(
        "resource_items",
        sa.Column("doc_markdown", sa.Text(), nullable=False, server_default=""),
    )


def downgrade() -> None:
    op.drop_column("resource_items", "doc_markdown")
    op.drop_column("resource_items", "doc_url")
    op.drop_column("resource_pools", "doc_markdown")
    op.drop_column("resource_pools", "doc_url")
