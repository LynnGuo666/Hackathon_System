"""add enrollments table

Revision ID: 0009_enrollment
Revises: 0008_site_config_basics
Create Date: 2026-06-11
"""

from alembic import op
import sqlalchemy as sa


revision = "0009_enrollment"
down_revision = "0008_site_config_basics"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "enrollments",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("full_name", sa.Text(), nullable=False, server_default=""),
        sa.Column("email", sa.Text(), nullable=False, unique=True),
        sa.Column("phone", sa.Text(), nullable=False, server_default=""),
        sa.Column("school", sa.Text(), nullable=False, server_default=""),
        sa.Column("team_name", sa.Text(), nullable=False, server_default=""),
        sa.Column("personal_bio", sa.Text(), nullable=False, server_default=""),
        sa.Column("project_desc", sa.Text(), nullable=False, server_default=""),
        sa.Column("participation_history", sa.Text(), nullable=False, server_default=""),
        sa.Column("github_url", sa.Text(), nullable=False, server_default=""),
        sa.Column("portfolio_url", sa.Text(), nullable=False, server_default=""),
        sa.Column("resume_filename", sa.Text(), nullable=False, server_default=""),
        sa.Column("review_status", sa.Text(), nullable=False, server_default="pending"),
        sa.Column("initial_reviewer", sa.Text(), nullable=False, server_default=""),
        sa.Column("initial_review_at", sa.Text(), nullable=False, server_default=""),
        sa.Column("initial_review_note", sa.Text(), nullable=False, server_default=""),
        sa.Column("final_reviewer", sa.Text(), nullable=False, server_default=""),
        sa.Column("final_review_at", sa.Text(), nullable=False, server_default=""),
        sa.Column("final_review_note", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("enrollments")
