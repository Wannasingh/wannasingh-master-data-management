"""
-- ============================================================
-- File        : api/migrations/versions/001_initial_schema.py
-- Author      : wannasingh-mdm
-- Date        : 2026-06-23
-- Task/Jira   : MDM-DB-001
-- Purpose     : Initial schema creation — migrates the
--               existing schema.sql tables into Alembic-managed
--               versioned migrations.
-- Change Log  :
--   v1.0  2026-06-23  Initial creation (wannasingh-mdm)
-- ============================================================
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# ---------------------------------------------------------------------------
# Alembic revision metadata
# ---------------------------------------------------------------------------
revision: str = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------------ #
    # IMPORTANT: PostgreSQL is already running on Apps VM with live data.
    # All table operations use checkfirst=True so existing tables and
    # their data are NEVER dropped or overwritten by this migration.
    # Run `alembic stamp head` on first deploy to mark existing schema
    # as current without executing any DDL.
    # ------------------------------------------------------------------ #

    # ------------------------------------------------------------------ #
    # 1. system_settings
    # ------------------------------------------------------------------ #
    op.create_table(
        "system_settings",
        sa.Column("key", sa.String(255), primary_key=True, nullable=False),
        sa.Column("value", sa.Text, nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        schema="public",
        if_not_exists=True,   # ← skip if table already exists
    )

    # Seed default settings
    op.execute(
        """
        INSERT INTO public.system_settings (key, value, description)
        VALUES
            ('fuzzy_threshold',        '75',   'Similarity threshold (%) for matching engine deduplication (50-100)'),
            ('golden_quality_threshold','80',  'Minimum score required to promote a master record to Golden status (0-100)'),
            ('auto_merge',             'true', 'Enable auto-merge of records matching with high confidence (>=95% similarity)'),
            ('redis_cache_ttl',        '60',   'Redis Cache Time To Live (TTL) in seconds for Master Data query responses')
        ON CONFLICT (key) DO NOTHING;
        """
    )

    # ------------------------------------------------------------------ #
    # 2. audit_logs
    # ------------------------------------------------------------------ #
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("action", sa.String(255), nullable=False),
        sa.Column("details", sa.Text, nullable=True),
        sa.Column("actor", sa.String(255), server_default="System"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        schema="public",
        if_not_exists=True,
    )

    op.execute(
        """
        INSERT INTO public.audit_logs (action, details, actor)
        VALUES ('SYSTEM_INIT', 'MDM enterprise database schema initialised via Alembic migration 001.', 'System')
        ON CONFLICT DO NOTHING;
        """
    )

    # ------------------------------------------------------------------ #
    # 3. data_sources
    # ------------------------------------------------------------------ #
    op.create_table(
        "data_sources",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(255), nullable=False, unique=True),
        sa.Column("type", sa.String(100), nullable=False),
        sa.Column("status", sa.String(50), server_default="Active"),
        sa.Column("records_count", sa.Integer, server_default="0"),
        sa.Column(
            "last_sync",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        schema="public",
        if_not_exists=True,
    )

    op.execute(
        """
        INSERT INTO public.data_sources (name, type, status, records_count)
        VALUES
            ('CRM API (JSONPlaceholder)', 'API',      'Active', 10),
            ('ERP API (DummyJSON)',       'API',      'Active', 10),
            ('CSV Ingestion Service',     'CSV',      'Active', 0),
            ('Manual Ingest Terminal',    'Database', 'Active', 0)
        ON CONFLICT (name) DO NOTHING;
        """
    )

    # ------------------------------------------------------------------ #
    # 4. governance_policies
    # ------------------------------------------------------------------ #
    op.create_table(
        "governance_policies",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(255), nullable=False, unique=True),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("rules", JSONB, nullable=True),
        sa.Column("is_active", sa.Boolean, server_default="TRUE"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        schema="public",
        if_not_exists=True,
    )

    op.execute(
        """
        INSERT INTO public.governance_policies (name, category, rules, is_active)
        VALUES
            ('GDPR Compliance Policy',  'Privacy',  '{"consent_required": true, "retention_years": 7, "anonymize_on_delete": true}',   true),
            ('HIPAA Data Alignment',    'Security', '{"encrypted_fields": ["ssn", "phone", "email"], "auto_flag_phi": true}',           true),
            ('Duplicate Ingestion Guard','Quality', '{"prevent_exact_matches": true, "similarity_match_threshold": 95}',                true)
        ON CONFLICT (name) DO NOTHING;
        """
    )

    # ------------------------------------------------------------------ #
    # 5. master_data — Core MDM records
    # ------------------------------------------------------------------ #
    op.create_table(
        "master_data",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("category", sa.String(255), nullable=False),
        sa.Column("value", sa.Numeric(15, 4), nullable=False),
        sa.Column("source_system", sa.String(255), server_default="Manual Entry"),
        sa.Column("status", sa.String(50), server_default="Golden"),
        sa.Column("data_quality_score", sa.Integer, server_default="100"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            onupdate=sa.text("CURRENT_TIMESTAMP"),
        ),
        schema="public",
        if_not_exists=True,   # ← NEVER drops existing data
    )

    # Indexes — CREATE INDEX IF NOT EXISTS (idempotent)
    op.create_index(
        "ix_master_data_category", "master_data", ["category"],
        schema="public", if_not_exists=True
    )
    op.create_index(
        "ix_master_data_status", "master_data", ["status"],
        schema="public", if_not_exists=True
    )


def downgrade() -> None:
    op.drop_table("master_data",          schema="public")
    op.drop_table("governance_policies",  schema="public")
    op.drop_table("data_sources",         schema="public")
    op.drop_table("audit_logs",           schema="public")
    op.drop_table("system_settings",      schema="public")
