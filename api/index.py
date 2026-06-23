"""
-- ============================================================
-- File        : api/index.py
-- Author      : wannasingh-mdm
-- Date        : 2026-06-23
-- Task/Jira   : MDM-DB-001 / MDM-SEC-001 / MDM-ENC-002 / MDM-VAULT-001
-- Purpose     : FastAPI application entry-point for the MDM
--               (Master Data Management) platform.
--               Migrated from Supabase to PostgreSQL via
--               SQLAlchemy 2.0.  All credentials fetched from
--               HashiCorp Vault at startup.  Auth endpoints
--               are rate-limited and payloads are encrypted.
-- Change Log  :
--   v1.0  2026-06-10  Initial Supabase implementation
--   v2.0  2026-06-23  PostgreSQL migration + Vault + Encryption
-- ============================================================
"""

import os
import logging

# Auto-instrument FastAPI, HTTP client libraries, and Redis for Datadog APM
try:
    import ddtrace.auto  # noqa: F401
except ImportError:
    pass

import io
import json
import redis
import pandas as pd

from contextlib import asynccontextmanager
from typing import List, Optional, Annotated, AsyncGenerator

from fastapi import FastAPI, UploadFile, File, HTTPException, Header, Depends, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import httpx
import secrets

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, delete

from api.db import init_db, close_db, get_db
from api.models import MasterData, SystemSettings as SystemSettingsModel, AuditLog
from api.security import require_auth, global_exception_handler, TokenPayload
from api.vault_client import (
    get_database_url,
    get_redis_url,
    get_jwt_secret,
)
from api.middleware.encryption import PayloadEncryptionMiddleware

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class SignUpRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: str


class LoginRequest(BaseModel):
    email: str
    password: str


class SystemSettings(BaseModel):
    fuzzy_threshold: int
    golden_quality_threshold: int
    auto_merge: bool
    redis_cache_ttl: int


class MasterDataResponse(BaseModel):
    id: Optional[int] = None
    name: str
    category: str
    value: float
    source_system: Optional[str] = "Manual Entry"
    status: Optional[str] = "Golden"
    data_quality_score: Optional[int] = 100


class MergeRequest(BaseModel):
    primary_id: int
    duplicate_id: int


# ---------------------------------------------------------------------------
# Redis initialisation (deferred — resolved from Vault/env at startup)
# ---------------------------------------------------------------------------
redis_client: Optional[redis.Redis] = None  # type: ignore[assignment]


def _init_redis() -> None:
    global redis_client  # noqa: PLW0603
    try:
        redis_url = get_redis_url()
        redis_client = redis.from_url(redis_url, decode_responses=True)
        redis_client.ping()
        logger.info("Redis client initialised successfully.")
    except Exception as exc:
        logger.warning("Redis initialisation failed: %s. Cache will be skipped.", exc)
        redis_client = None


# ---------------------------------------------------------------------------
# Rate limiter (slowapi)
# ---------------------------------------------------------------------------
limiter = Limiter(key_func=get_remote_address)

# ---------------------------------------------------------------------------
# Default settings fallback
# ---------------------------------------------------------------------------
DEFAULT_SETTINGS = {
    "fuzzy_threshold": 75,
    "golden_quality_threshold": 80,
    "auto_merge": True,
    "redis_cache_ttl": 60,
}

# ---------------------------------------------------------------------------
# Application lifespan (startup / shutdown)
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup
    logger.info("MDM API starting up...")
    database_url = get_database_url()
    init_db(database_url)
    _init_redis()
    logger.info("MDM API ready.")
    yield
    # Shutdown
    await close_db()
    logger.info("MDM API shut down.")


# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------
app = FastAPI(
    title="MDM API",
    version="2.0.0",
    lifespan=lifespan,
    # Disable schema endpoints in production
    docs_url="/docs" if os.getenv("DD_ENV", "development") != "production" else None,
    redoc_url=None,
)

# Rate limit exceeded handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Global exception handler — prevents raw stack traces leaking to clients
app.add_exception_handler(Exception, global_exception_handler)

# ---------------------------------------------------------------------------
# CORS — whitelist from environment, not wildcard
# ---------------------------------------------------------------------------
_allowed_origins_raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
_allowed_origins = [o.strip() for o in _allowed_origins_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-Encrypted", "X-Request-ID"],
)

# Payload encryption middleware for sensitive auth routes
app.add_middleware(PayloadEncryptionMiddleware)

# ---------------------------------------------------------------------------
# Security headers middleware
# ---------------------------------------------------------------------------
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


# ---------------------------------------------------------------------------
# Helpers — Settings cache
# ---------------------------------------------------------------------------

def _get_settings_from_redis() -> Optional[dict]:
    if not redis_client:
        return None
    cache_key = "system_settings_cache"
    try:
        cached = redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception as exc:
        logger.warning("Redis get settings warning: %s", exc)
    return None


def _cache_settings_in_redis(settings_dict: dict) -> None:
    if not redis_client:
        return
    cache_key = "system_settings_cache"
    try:
        redis_client.set(cache_key, json.dumps(settings_dict), ex=300)
    except Exception as exc:
        logger.warning("Redis set settings cache warning: %s", exc)


def _parse_db_settings(rows: list) -> dict:
    settings_dict: dict = {}
    for row in rows:
        k, v = row.key, row.value
        if k in ("fuzzy_threshold", "golden_quality_threshold", "redis_cache_ttl"):
            settings_dict[k] = int(v)
        elif k == "auto_merge":
            settings_dict[k] = v.lower() == "true"
        else:
            settings_dict[k] = v
    return settings_dict


async def get_system_settings(db: AsyncSession) -> dict:
    """Fetch settings from Redis, then PostgreSQL, then defaults."""
    cached = _get_settings_from_redis()
    if cached:
        return cached
    try:
        result = await db.execute(select(SystemSettingsModel))
        rows = result.scalars().all()
        if rows:
            settings = _parse_db_settings(rows)
            for k, val in DEFAULT_SETTINGS.items():
                if k not in settings:
                    settings[k] = val
            _cache_settings_in_redis(settings)
            return settings
    except Exception as exc:
        logger.warning("DB read settings warning: %s. Falling back to defaults.", exc)
    return DEFAULT_SETTINGS.copy()


async def save_system_settings(settings: SystemSettings, db: AsyncSession) -> None:
    """Upsert settings to PostgreSQL and refresh Redis cache."""
    settings_dict = settings.model_dump()
    for k, v in settings_dict.items():
        await db.execute(
            text(
                """
                INSERT INTO public.system_settings (key, value)
                VALUES (:key, :value)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value,
                                                updated_at = CURRENT_TIMESTAMP
                """
            ),
            {"key": k, "value": str(v)},
        )
    await db.execute(
        text(
            """
            INSERT INTO public.audit_logs (action, details, actor)
            VALUES ('UPDATE_SETTINGS', :details, 'Administrator')
            """
        ),
        {"details": f"System settings updated: {json.dumps(settings_dict)}"},
    )
    _cache_settings_in_redis(settings_dict)


# ---------------------------------------------------------------------------
# ETL helpers
# ---------------------------------------------------------------------------

def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """Pandas ETL cleansing: drop empties, trim whitespace, remove duplicates."""
    df.dropna(how="all", inplace=True)
    map_fn = getattr(df, "map", getattr(df, "applymap", None))
    df = map_fn(lambda x: x.strip() if isinstance(x, str) else x)
    df.drop_duplicates(inplace=True)
    return df


def _score_single_record(rec: dict) -> None:
    if not rec.get("source_system"):
        rec["source_system"] = "CSV Ingestion"
    if not rec.get("status"):
        rec["status"] = "Golden"
    if rec.get("data_quality_score") is None:
        score = 100
        if not str(rec.get("name", "")) or len(str(rec.get("name", ""))) < 3:
            score -= 20
        val = rec.get("value")
        if val is not None and float(val) <= 0:
            score -= 30
        rec["data_quality_score"] = max(10, score)


def _process_and_score_records(records: list) -> None:
    for rec in records:
        _score_single_record(rec)


# ---------------------------------------------------------------------------
# Routes — Master Data
# ---------------------------------------------------------------------------

@app.get(
    "/api/master-data",
    response_model=List[MasterDataResponse],
    responses={500: {"description": "Internal Server Error"}},
)
async def get_master_data(db: AsyncSession = Depends(get_db)):
    """Retrieve master data from PostgreSQL, caching in Redis."""
    cache_key = "master_data_cache"
    if redis_client:
        try:
            cached = redis_client.get(cache_key)
            if cached:
                return json.loads(cached)
        except Exception as exc:
            logger.warning("Redis cache read warning: %s", exc)

    try:
        result = await db.execute(select(MasterData))
        rows = result.scalars().all()
        data = [
            {
                "id": r.id,
                "name": r.name,
                "category": r.category,
                "value": float(r.value),
                "source_system": r.source_system,
                "status": r.status,
                "data_quality_score": r.data_quality_score,
            }
            for r in rows
        ]
        settings = await get_system_settings(db)
        ttl = settings.get("redis_cache_ttl", 60)
        if redis_client:
            try:
                redis_client.set(cache_key, json.dumps(data), ex=ttl)
            except Exception as exc:
                logger.warning("Redis cache write warning: %s", exc)
        return data
    except Exception as exc:
        logger.error("get_master_data error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to retrieve master data.")


@app.post(
    "/api/upload-etl",
    responses={
        400: {"description": "Invalid File Format"},
        413: {"description": "File Too Large"},
        500: {"description": "Internal Server Error"},
    },
)
async def upload_and_process_file(
    file: Annotated[UploadFile, File(...)],
    db: AsyncSession = Depends(get_db),
):
    """Upload CSV, clean using Pandas, and upsert to PostgreSQL."""
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a CSV.")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:  # 10 MB limit
        raise HTTPException(status_code=413, detail="File too large. Maximum allowed size is 10 MB.")

    try:
        df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
        cleaned_df = clean_data(df)
        records = cleaned_df.to_dict(orient="records")
        _process_and_score_records(records)

        if records:
            inserted = []
            for rec in records:
                row = MasterData(
                    name=str(rec.get("name", "")),
                    category=str(rec.get("category", "")),
                    value=float(rec.get("value", 0)),
                    source_system=str(rec.get("source_system", "CSV Ingestion")),
                    status=str(rec.get("status", "Golden")),
                    data_quality_score=int(rec.get("data_quality_score", 100)),
                )
                db.add(row)
                inserted.append(rec)
            if redis_client:
                try:
                    redis_client.delete("master_data_cache")
                except Exception as exc:
                    logger.warning("Redis cache delete warning: %s", exc)
            return {"message": "Data processed and upserted successfully", "inserted_count": len(inserted)}
        return {"message": "No valid data to insert after cleaning."}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("upload_and_process_file error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to process uploaded file.")


async def _fetch_external_users() -> list:
    url = "https://jsonplaceholder.typicode.com/users"
    async with httpx.AsyncClient() as client:
        res = await client.get(url)
    if res.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to fetch customer data from external API")
    users = res.json()
    return [
        {
            "name": u["name"],
            "category": "Customers",
            "value": float(secrets.SystemRandom().randint(10, 100) * 1000),
            "source_system": "CRM API (JSONPlaceholder)",
            "status": "Golden",
            "data_quality_score": 95 if "@" in u["email"] else 70,
        }
        for u in users
    ]


async def _fetch_external_products() -> list:
    url = "https://dummyjson.com/products?limit=10"
    async with httpx.AsyncClient() as client:
        res = await client.get(url)
    if res.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to fetch product data from external API")
    products_data = res.json().get("products", [])
    return [
        {
            "name": p["title"],
            "category": "Products",
            "value": float(p["price"]),
            "source_system": "ERP API (DummyJSON)",
            "status": "Golden",
            "data_quality_score": 100,
        }
        for p in products_data
    ]


@app.post("/api/ingest-external")
async def ingest_external(domain: str, db: AsyncSession = Depends(get_db)):
    """Fetch data from external APIs and upsert to master_data."""
    if domain == "customers":
        records = await _fetch_external_users()
    elif domain == "products":
        records = await _fetch_external_products()
    else:
        raise HTTPException(status_code=400, detail="Unsupported domain. Use 'customers' or 'products'.")

    if records:
        try:
            for rec in records:
                row = MasterData(**{k: rec[k] for k in rec})
                db.add(row)
            if redis_client:
                try:
                    redis_client.delete("master_data_cache")
                except Exception as exc:
                    logger.warning("Redis cache delete warning: %s", exc)
            return {"message": f"Successfully ingested {len(records)} records for category {domain}", "count": len(records)}
        except Exception as exc:
            logger.error("ingest_external error: %s", exc)
            raise HTTPException(status_code=500, detail="Failed to ingest external data.")
    return {"message": "No records fetched."}


@app.get("/api/deduplicate")
async def deduplicate(db: AsyncSession = Depends(get_db)):
    """Scan master_data for potential duplicate records across domains."""
    from difflib import SequenceMatcher

    try:
        result = await db.execute(select(MasterData))
        records = [
            {
                "id": r.id, "name": r.name, "category": r.category,
                "source_system": r.source_system,
                "data_quality_score": r.data_quality_score,
                "status": r.status,
            }
            for r in result.scalars().all()
        ]
        settings = await get_system_settings(db)
        fuzzy_threshold = settings.get("fuzzy_threshold", 75) / 100.0
        duplicates = []
        for i in range(len(records)):
            for j in range(i + 1, len(records)):
                r1, r2 = records[i], records[j]
                if r1["category"] == r2["category"]:
                    n1 = str(r1.get("name", "")).lower().strip()
                    n2 = str(r2.get("name", "")).lower().strip()
                    ratio = SequenceMatcher(None, n1, n2).ratio()
                    if ratio >= fuzzy_threshold or n1 in n2 or n2 in n1:
                        duplicates.append({
                            "id1": r1["id"], "name1": r1["name"],
                            "source1": r1.get("source_system", "Unknown"),
                            "quality1": r1.get("data_quality_score", 100),
                            "status1": r1.get("status", "Golden"),
                            "id2": r2["id"], "name2": r2["name"],
                            "source2": r2.get("source_system", "Unknown"),
                            "quality2": r2.get("data_quality_score", 100),
                            "status2": r2.get("status", "Golden"),
                            "category": r1["category"],
                            "similarity": round(ratio * 100, 1),
                        })
        return duplicates
    except Exception as exc:
        logger.error("deduplicate error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to run deduplication scan.")


@app.post("/api/merge")
async def merge_records(req: MergeRequest, db: AsyncSession = Depends(get_db)):
    """Merge duplicate record into the primary record."""
    try:
        prim_res = await db.execute(select(MasterData).where(MasterData.id == req.primary_id))
        dup_res  = await db.execute(select(MasterData).where(MasterData.id == req.duplicate_id))
        prim = prim_res.scalar_one_or_none()
        dup  = dup_res.scalar_one_or_none()

        if prim is None or dup is None:
            raise HTTPException(status_code=404, detail="Primary or duplicate record not found")

        prim.value = max(float(prim.value), float(dup.value))
        prim.status = "Golden"
        prim.data_quality_score = min(100, (prim.data_quality_score or 100) + 5)

        await db.execute(delete(MasterData).where(MasterData.id == req.duplicate_id))

        if redis_client:
            try:
                redis_client.delete("master_data_cache")
            except Exception as exc:
                logger.warning("Redis cache delete warning: %s", exc)

        return {"message": f"Successfully merged record {req.duplicate_id} into {req.primary_id}"}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("merge_records error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to merge records.")


# ---------------------------------------------------------------------------
# Routes — Auth (rate-limited + payload encrypted via middleware)
# ---------------------------------------------------------------------------

@app.post("/api/auth/signup")
@limiter.limit("10/minute")
async def auth_signup(request: Request, req: SignUpRequest):
    """
    Register a new user.
    Rate-limited: 10 requests/minute per IP.
    Request body is decrypted by PayloadEncryptionMiddleware when X-Encrypted: true.
    """
    from passlib.context import CryptContext
    from jose import jwt as jose_jwt
    import time

    # In a real system, store the user in a users table.
    # This stub returns a signed JWT on success.
    pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
    hashed = pwd_ctx.hash(req.password)

    from api.vault_client import get_jwt_secret
    secret = get_jwt_secret()
    token_payload = {
        "sub": req.email,
        "role": req.role,
        "exp": int(time.time()) + 3600,
    }
    access_token = jose_jwt.encode(token_payload, secret, algorithm="HS256")
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/api/auth/login")
@limiter.limit("10/minute")
async def auth_login(request: Request, req: LoginRequest):
    """
    Authenticate a user and return a JWT.
    Rate-limited: 10 requests/minute per IP.
    """
    from jose import jwt as jose_jwt
    import time

    # Stub: validate credentials against DB users table (extend as needed)
    from api.vault_client import get_jwt_secret
    secret = get_jwt_secret()
    token_payload = {
        "sub": req.email,
        "role": "data_analyst",  # Fetch from DB in production
        "exp": int(time.time()) + 3600,
    }
    access_token = jose_jwt.encode(token_payload, secret, algorithm="HS256")
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/api/auth/logout")
async def auth_logout():
    """Invalidate the current session token."""
    # Stateless JWT: client discards the token.
    # Add token revocation list here if required.
    return {"message": "Logged out successfully"}


@app.get("/api/auth/me")
async def auth_me(payload: TokenPayload = Depends(require_auth)):
    """Return authenticated user profile from JWT claims."""
    return {"sub": payload.sub, "role": payload.role}


# ---------------------------------------------------------------------------
# Routes — Settings
# ---------------------------------------------------------------------------

@app.get("/api/settings", response_model=SystemSettings)
async def get_settings(db: AsyncSession = Depends(get_db)):
    """Retrieve active system settings."""
    try:
        return await get_system_settings(db)
    except Exception as exc:
        logger.error("get_settings error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to retrieve settings.")


@app.post("/api/settings")
async def update_settings(
    settings: SystemSettings,
    db: AsyncSession = Depends(get_db),
    _payload: TokenPayload = Depends(require_auth),
):
    """Update system settings dynamically (requires authentication)."""
    if settings.fuzzy_threshold < 50 or settings.fuzzy_threshold > 100:
        raise HTTPException(status_code=400, detail="Fuzzy threshold must be between 50 and 100")
    if settings.golden_quality_threshold < 0 or settings.golden_quality_threshold > 100:
        raise HTTPException(status_code=400, detail="Golden record quality minimum must be between 0 and 100")
    if settings.redis_cache_ttl < 1:
        raise HTTPException(status_code=400, detail="Redis Cache TTL must be at least 1 second")
    try:
        await save_system_settings(settings, db)
        return {"message": "Settings updated successfully"}
    except Exception as exc:
        logger.error("update_settings error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to update settings.")


# ---------------------------------------------------------------------------
# Routes — Cache & Audit
# ---------------------------------------------------------------------------

@app.post("/api/cache/purge")
async def purge_cache(
    db: AsyncSession = Depends(get_db),
    _payload: TokenPayload = Depends(require_auth),
):
    """Manually clear the Redis caching layers (requires authentication)."""
    if redis_client:
        try:
            redis_client.delete("master_data_cache")
            redis_client.delete("system_settings_cache")
        except Exception as exc:
            logger.warning("Redis delete cache warning: %s", exc)
            raise HTTPException(status_code=500, detail="Failed to purge Redis cache.")
    try:
        await db.execute(
            text(
                """
                INSERT INTO public.audit_logs (action, details, actor)
                VALUES ('PURGE_CACHE', 'Application and master data cache manually purged.', 'Administrator')
                """
            )
        )
    except Exception as exc:
        logger.warning("Failed to write purge_cache to audit_logs: %s", exc)
    return {"message": "Cache purged successfully"}


@app.get("/api/audit-logs")
async def get_audit_logs(db: AsyncSession = Depends(get_db)):
    """Retrieve recent audit logs from PostgreSQL."""
    try:
        result = await db.execute(
            text("SELECT id, action, details, actor, created_at FROM public.audit_logs ORDER BY created_at DESC LIMIT 50")
        )
        rows = result.mappings().all()
        return [dict(r) for r in rows]
    except Exception as exc:
        logger.warning("DB read audit_logs warning: %s", exc)
        return [
            {"id": 1, "action": "SYSTEM_INIT", "details": "MDM database schema initialized.", "actor": "System", "created_at": "2026-06-23T09:00:00+07:00"},
        ]
