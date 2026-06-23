"""
-- ============================================================
-- File        : api/migrations/env.py  (Alembic environment)
-- Author      : wannasingh-mdm
-- Date        : 2026-06-23
-- Task/Jira   : MDM-DB-001
-- Purpose     : Alembic async migration environment.
--               Reads DATABASE_URL from environment / Vault
--               and runs migrations against the target Postgres.
-- ============================================================
"""

import asyncio
import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine

# Alembic Config object
config = context.config

# Set up logging from alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ---------------------------------------------------------------------------
# Import Base metadata so Alembic can detect model changes
# ---------------------------------------------------------------------------
from api.db import Base  # noqa: E402
import api.models  # noqa: E402, F401 — ensure all models are registered

target_metadata = Base.metadata

# ---------------------------------------------------------------------------
# Database URL — from Vault or env
# ---------------------------------------------------------------------------

def _get_url() -> str:
    try:
        from api.vault_client import get_database_url
        url = get_database_url()
    except Exception:
        url = os.getenv("DATABASE_URL", "")

    if not url:
        raise RuntimeError("DATABASE_URL is not configured.")

    # Convert to asyncpg driver
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url


# ---------------------------------------------------------------------------
# Async migration runner
# ---------------------------------------------------------------------------

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (emit SQL to stdout)."""
    context.configure(
        url=_get_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = create_async_engine(_get_url(), echo=False)
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
