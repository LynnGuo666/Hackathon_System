"""split feature links from navigation links

Revision ID: 0002_feature_links
Revises: 0001_initial_schema
Create Date: 2026-06-02
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_feature_links"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


FEATURE_NAV_IDS = (
    "nav_profile",
    "nav_accommodation",
    "nav_identity",
    "nav_resources",
    "nav_dashboard",
)


def upgrade() -> None:
    op.create_table(
        "feature_links",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("enabled", sa.Integer(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
    )
    op.execute(
        """
INSERT INTO feature_links (id, title, description, url, enabled, sort_order, created_at, updated_at)
SELECT
  REPLACE(id, 'nav_', 'feat_'),
  title,
  description,
  url,
  enabled,
  sort_order,
  created_at,
  updated_at
FROM navigation_links
WHERE id IN ('nav_profile', 'nav_accommodation', 'nav_identity', 'nav_resources', 'nav_dashboard')
"""
    )
    op.execute(
        """
DELETE FROM navigation_links
WHERE id IN ('nav_profile', 'nav_accommodation', 'nav_identity', 'nav_resources', 'nav_dashboard')
"""
    )


def downgrade() -> None:
    op.execute(
        """
INSERT INTO navigation_links (id, title, description, url, enabled, sort_order, created_at, updated_at)
SELECT
  REPLACE(id, 'feat_', 'nav_'),
  title,
  description,
  url,
  enabled,
  sort_order,
  created_at,
  updated_at
FROM feature_links
WHERE id IN ('feat_profile', 'feat_accommodation', 'feat_identity', 'feat_resources', 'feat_dashboard')
"""
    )
    op.drop_table("feature_links")
