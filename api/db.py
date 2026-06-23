"""
-- ============================================================
-- File        : api/db.py
-- Author      : wannasingh-mdm
-- Date        : 2026-06-23
-- Task/Jira   : MDM-DB-001
-- Purpose     : SQLAlchemy 2.0 async database engine and
--               session factory for PostgreSQL.
--               Connection string is fetched from Vault at
--               startup — never from a static config file.
-- ============================================================
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Declarative base — all ORM models inherit from this
# ---------------------------------------------------------------------------


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# Engine & session factory (module-level singletons)
# ---------------------------------------------------------------------------

_engine = None
_async_session_factory = None


def init_db(database_url: str) -> None:
    """
    Initialise the async engine and session factory.
    Must be called once at application startup (in the lifespan hook).

    Parameters
    ----------
    database_url : asyncpg-compatible URL, e.g.
        ``postgresql+asyncpg://user:pass@host:5432/dbname``
    """
    global _engine, _async_session_factory  # noqa: PLW0603

    # Ensure the driver prefix is correct for asyncpg
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)

    _engine = create_async_engine(
        database_url,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,          # Detect stale connections before use
        echo=False,                  # Set True only for SQL debug logging
    )

    _async_session_factory = async_sessionmaker(
        bind=_engine,
        class_=AsyncSession,
        expire_on_commit=False,      # Avoid lazy-load errors after commit
    )

    logger.info("Database engine initialised.")


async def close_db() -> None:
    """Dispose the engine — call on application shutdown."""
    global _engine  # noqa: PLW0603
    if _engine is not None:
        await _engine.dispose()
        logger.info("Database engine disposed.")


# ---------------------------------------------------------------------------
# FastAPI dependency — yields an async session per request
# ---------------------------------------------------------------------------


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that provides a scoped async DB session.

    Usage::

        @app.get("/items")
        async def list_items(db: AsyncSession = Depends(get_db)):
            result = await db.execute(select(Item))
            return result.scalars().all()
    """
    if _async_session_factory is None:
        raise RuntimeError("Database has not been initialised. Call init_db() first.")

    async with _async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# ---------------------------------------------------------------------------
# Context manager variant (for use outside request/response cycle)
# ---------------------------------------------------------------------------


@asynccontextmanager
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Async context manager for use outside of FastAPI dependency injection."""
    async with get_db() as session:
        yield session
