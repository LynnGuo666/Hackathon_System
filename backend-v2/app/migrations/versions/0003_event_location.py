"""add event location config

Revision ID: 0003_event_location
Revises: 0002_feature_links
Create Date: 2026-06-02
"""

from alembic import op
import sqlalchemy as sa


revision = "0003_event_location"
down_revision = "0002_feature_links"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "event_location",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False, server_default=""),
        sa.Column("address", sa.Text(), nullable=False, server_default=""),
        sa.Column("latitude", sa.Float()),
        sa.Column("longitude", sa.Float()),
        sa.Column("osm_type", sa.Text(), nullable=False, server_default=""),
        sa.Column("osm_id", sa.Text(), nullable=False, server_default=""),
        sa.Column("osm_url", sa.Text(), nullable=False, server_default=""),
        sa.Column("updated_at", sa.Text(), nullable=False),
    )
    op.execute(
        """
INSERT INTO event_location (id, name, address, latitude, longitude, osm_type, osm_id, osm_url, updated_at)
VALUES ('default', '', '', NULL, NULL, '', '', '', CURRENT_TIMESTAMP)
"""
    )
    op.execute(
        """
INSERT INTO feature_links (id, title, description, url, enabled, sort_order, created_at, updated_at)
VALUES ('feat_location', '赛事地点', '查看比赛地点、地址和地图', '/p/location', 1, 35, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT(id) DO NOTHING
"""
    )


def downgrade() -> None:
    op.execute("DELETE FROM feature_links WHERE id = 'feat_location'")
    op.drop_table("event_location")
