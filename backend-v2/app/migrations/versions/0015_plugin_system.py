"""add plugin system tables

Revision ID: 0015_plugin_system
Revises: 0014_email_provider_config
Create Date: 2026-06-18
"""

from alembic import op
import sqlalchemy as sa


revision = "0015_plugin_system"
down_revision = "0014_email_provider_config"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "plugin_configs",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("enabled", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("config", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("status", sa.Text(), nullable=False, server_default="disabled"),
        sa.Column("last_error", sa.Text(), nullable=False, server_default=""),
        sa.Column("last_sync_at", sa.Text()),
        sa.Column("updated_at", sa.Text(), nullable=False),
    )

    op.create_table(
        "participant_sessions",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("email", sa.Text(), nullable=False, server_default=""),
        sa.Column("participant_id", sa.Text(), nullable=False, server_default=""),
        sa.Column("plugin_id", sa.Text(), nullable=False, server_default=""),
        sa.Column("session_token_hash", sa.Text(), nullable=False, unique=True),
        sa.Column("status", sa.Text(), nullable=False, server_default="active"),
        sa.Column("expires_at", sa.Text(), nullable=False),
        sa.Column("revoked_at", sa.Text()),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
    )
    op.create_index(
        "idx_participant_sessions_token_status",
        "participant_sessions",
        ["session_token_hash", "status"],
    )
    op.create_index(
        "idx_participant_sessions_email",
        "participant_sessions",
        ["email"],
    )

    op.create_table(
        "oauth_identities",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("plugin_id", sa.Text(), nullable=False),
        sa.Column("participant_id", sa.Text(), nullable=False, server_default=""),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("provider", sa.Text(), nullable=False, server_default="oauth"),
        sa.Column("provider_subject", sa.Text(), nullable=False),
        sa.Column("access_token_ciphertext", sa.Text(), nullable=False, server_default=""),
        sa.Column("refresh_token_ciphertext", sa.Text(), nullable=False, server_default=""),
        sa.Column("token_expires_at", sa.Text()),
        sa.Column("profile", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.UniqueConstraint(
            "plugin_id",
            "provider",
            "provider_subject",
            name="uq_oauth_identities_provider_subject",
        ),
    )
    op.create_index(
        "idx_oauth_identities_email",
        "oauth_identities",
        ["email"],
    )

    op.create_table(
        "oauth_transactions",
        sa.Column("state", sa.Text(), primary_key=True),
        sa.Column("plugin_id", sa.Text(), nullable=False),
        sa.Column("nonce", sa.Text(), nullable=False),
        sa.Column("code_verifier", sa.Text(), nullable=False),
        sa.Column("redirect_uri", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.Text(), nullable=False),
        sa.Column("created_at", sa.Text(), nullable=False),
    )
    op.create_index(
        "idx_oauth_transactions_expires",
        "oauth_transactions",
        ["expires_at"],
    )

    op.create_table(
        "plugin_sync_events",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("plugin_id", sa.Text(), nullable=False),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column("aggregate_type", sa.Text(), nullable=False),
        sa.Column("aggregate_id", sa.Text(), nullable=False),
        sa.Column("idempotency_key", sa.Text(), nullable=False, unique=True),
        sa.Column("payload", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("status", sa.Text(), nullable=False, server_default="pending"),
        sa.Column("task_id", sa.Text(), nullable=False, server_default=""),
        sa.Column("last_error", sa.Text(), nullable=False, server_default=""),
        sa.Column("occurred_at", sa.Text(), nullable=False),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
    )
    op.create_index(
        "idx_plugin_sync_events_status",
        "plugin_sync_events",
        ["status", "created_at"],
    )
    op.create_index(
        "idx_plugin_sync_events_plugin",
        "plugin_sync_events",
        ["plugin_id", "created_at"],
    )

    op.create_table(
        "plugin_import_batches",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("plugin_id", sa.Text(), nullable=False),
        sa.Column("source", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="pending"),
        sa.Column("total_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("success_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failed_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("metadata", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("last_error", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
    )
    op.create_index(
        "idx_plugin_import_batches_plugin",
        "plugin_import_batches",
        ["plugin_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("idx_plugin_import_batches_plugin", table_name="plugin_import_batches")
    op.drop_table("plugin_import_batches")
    op.drop_index("idx_plugin_sync_events_plugin", table_name="plugin_sync_events")
    op.drop_index("idx_plugin_sync_events_status", table_name="plugin_sync_events")
    op.drop_table("plugin_sync_events")
    op.drop_index("idx_oauth_transactions_expires", table_name="oauth_transactions")
    op.drop_table("oauth_transactions")
    op.drop_index("idx_oauth_identities_email", table_name="oauth_identities")
    op.drop_table("oauth_identities")
    op.drop_index("idx_participant_sessions_email", table_name="participant_sessions")
    op.drop_index("idx_participant_sessions_token_status", table_name="participant_sessions")
    op.drop_table("participant_sessions")
    op.drop_table("plugin_configs")
