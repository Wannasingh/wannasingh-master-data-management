"""
-- ============================================================
-- File        : api/tests/test_main.py
-- Author      : wannasingh-mdm
-- Date        : 2026-06-23
-- Task/Jira   : MDM-TEST-001
-- Purpose     : Comprehensive unit tests for the FastAPI MDM
--               API. Covers all endpoints plus helpers to meet
--               the ≥90% branch/statement coverage requirement
--               for the SonarQube Quality Gate.
-- ============================================================
"""

from __future__ import annotations

import json
import pytest
import pandas as pd
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, MagicMock, patch

from api.index import (
    app,
    clean_data,
    _score_single_record,
    _process_and_score_records,
    _parse_db_settings,
    DEFAULT_SETTINGS,
)


# ===========================================================================
# Fixtures — shared mock setup
# ===========================================================================

@pytest.fixture(autouse=True)
def mock_redis_global(mocker):
    """Patch redis_client globally to avoid real network calls in every test."""
    mock = mocker.patch("api.index.redis_client")
    mock.get.return_value = None
    mock.set.return_value = True
    mock.delete.return_value = True
    mock.ping.return_value = True
    return mock


@pytest.fixture
def mock_db_session():
    """Return a pre-configured AsyncMock for the DB session dependency."""
    session = AsyncMock()
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.add = MagicMock()
    return session


@pytest.fixture
def override_get_db(mock_db_session):
    """Override the get_db FastAPI dependency with the mock session."""
    from api.db import get_db

    async def _override():
        yield mock_db_session

    app.dependency_overrides[get_db] = _override
    yield mock_db_session
    app.dependency_overrides.clear()


@pytest.fixture
def override_require_auth():
    """Override JWT auth to return a mock admin payload for auth-protected tests."""
    from api.security import require_auth
    from api.security import TokenPayload

    mock_payload = TokenPayload(sub="test@example.com", role="admin")
    app.dependency_overrides[require_auth] = lambda: mock_payload
    yield mock_payload
    app.dependency_overrides.clear()


# ===========================================================================
# 1. ETL helpers — clean_data
# ===========================================================================

def test_clean_data_removes_duplicates_and_trims():
    data = {
        "name":     ["  Product A  ", "Product B", "Product A  ", None],
        "category": ["  Category 1", "Category 2", "Category 1", None],
        "value":    [10.5, 20.0, 10.5, None],
    }
    df = pd.DataFrame(data)
    cleaned = clean_data(df)
    assert len(cleaned) == 2
    assert cleaned.iloc[0]["name"] == "Product A"
    assert cleaned.iloc[0]["category"] == "Category 1"
    assert cleaned["name"].notna().all()


def test_clean_data_all_valid():
    df = pd.DataFrame({"name": ["A", "B"], "value": [1, 2]})
    cleaned = clean_data(df)
    assert len(cleaned) == 2


def test_clean_data_all_empty():
    df = pd.DataFrame({"name": [None, None], "value": [None, None]})
    cleaned = clean_data(df)
    assert len(cleaned) == 0


# ===========================================================================
# 2. _score_single_record
# ===========================================================================

def test_score_defaults_for_complete_record():
    rec = {"name": "Valid Name", "value": 50.0}
    _score_single_record(rec)
    assert rec["source_system"] == "CSV Ingestion"
    assert rec["status"] == "Golden"
    assert rec["data_quality_score"] == 100


def test_score_penalises_short_name():
    rec = {"name": "AB", "value": 50.0}
    _score_single_record(rec)
    assert rec["data_quality_score"] == 80


def test_score_penalises_zero_value():
    rec = {"name": "Valid Name", "value": 0.0}
    _score_single_record(rec)
    assert rec["data_quality_score"] == 70


def test_score_penalises_both_short_and_zero():
    rec = {"name": "A", "value": 0.0}
    _score_single_record(rec)
    assert rec["data_quality_score"] == max(10, 100 - 20 - 30)


def test_score_does_not_overwrite_existing_values():
    rec = {
        "name": "X",
        "value": 10.0,
        "source_system": "ERP",
        "status": "Pending",
        "data_quality_score": 55,
    }
    _score_single_record(rec)
    assert rec["source_system"] == "ERP"
    assert rec["status"] == "Pending"
    assert rec["data_quality_score"] == 55


def test_process_and_score_records():
    records = [{"name": "Product A", "value": 100.0}]
    _process_and_score_records(records)
    assert records[0]["data_quality_score"] == 100


# ===========================================================================
# 3. _parse_db_settings
# ===========================================================================

def test_parse_db_settings_integers():
    rows = [
        MagicMock(key="fuzzy_threshold", value="80"),
        MagicMock(key="golden_quality_threshold", value="90"),
        MagicMock(key="redis_cache_ttl", value="120"),
    ]
    result = _parse_db_settings(rows)
    assert result["fuzzy_threshold"] == 80
    assert result["golden_quality_threshold"] == 90
    assert result["redis_cache_ttl"] == 120


def test_parse_db_settings_auto_merge_true():
    rows = [MagicMock(key="auto_merge", value="true")]
    result = _parse_db_settings(rows)
    assert result["auto_merge"] is True


def test_parse_db_settings_auto_merge_false():
    rows = [MagicMock(key="auto_merge", value="false")]
    result = _parse_db_settings(rows)
    assert result["auto_merge"] is False


def test_parse_db_settings_unknown_key():
    rows = [MagicMock(key="custom_key", value="custom_value")]
    result = _parse_db_settings(rows)
    assert result["custom_key"] == "custom_value"


# ===========================================================================
# 4. GET /api/master-data
# ===========================================================================

@pytest.mark.asyncio
async def test_get_master_data_from_db(override_get_db, mocker):
    mock_row = MagicMock(
        id=1, name="Test Product", category="Cat 1",
        value=100.0, source_system="Manual Entry",
        status="Golden", data_quality_score=100,
    )
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_row]
    override_get_db.execute.return_value = mock_result

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/master-data")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Test Product"


@pytest.mark.asyncio
async def test_get_master_data_cache_hit(mock_redis_global, override_get_db):
    cached = json.dumps([{"id": 1, "name": "Cached", "category": "X", "value": 10.0,
                          "source_system": "Manual", "status": "Golden", "data_quality_score": 100}])
    mock_redis_global.get.return_value = cached

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/master-data")

    assert response.status_code == 200
    assert response.json()[0]["name"] == "Cached"
    # DB should NOT be called on cache hit
    override_get_db.execute.assert_not_called()


@pytest.mark.asyncio
async def test_get_master_data_db_error(override_get_db):
    override_get_db.execute.side_effect = Exception("DB down")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/master-data")

    assert response.status_code == 500


# ===========================================================================
# 5. POST /api/upload-etl
# ===========================================================================

@pytest.mark.asyncio
async def test_upload_invalid_file_format():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/upload-etl",
            files={"file": ("test.txt", b"dummy", "text/plain")},
        )
    assert response.status_code == 400
    assert "CSV" in response.json()["detail"]


@pytest.mark.asyncio
async def test_upload_valid_csv(override_get_db):
    csv_content = b"name,category,value\nProduct A,Cat 1,100.0\nProduct B,Cat 2,200.0"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/upload-etl",
            files={"file": ("data.csv", csv_content, "text/csv")},
        )
    assert response.status_code == 200
    assert response.json()["inserted_count"] == 2


@pytest.mark.asyncio
async def test_upload_empty_csv_after_cleaning(override_get_db):
    csv_content = b"name,category,value\n,,"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/upload-etl",
            files={"file": ("data.csv", csv_content, "text/csv")},
        )
    assert response.status_code == 200
    assert "No valid data" in response.json()["message"]


@pytest.mark.asyncio
async def test_upload_file_too_large():
    large_content = b"x" * (11 * 1024 * 1024)  # 11 MB
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/upload-etl",
            files={"file": ("big.csv", large_content, "text/csv")},
        )
    assert response.status_code == 413


# ===========================================================================
# 6. POST /api/ingest-external
# ===========================================================================

@pytest.mark.asyncio
async def test_ingest_external_invalid_domain(override_get_db):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/ingest-external?domain=invalid")
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_ingest_external_customers(override_get_db, mocker):
    mock_users = [
        {"name": "John Doe", "email": "john@example.com"},
    ]
    mocker.patch("api.index._fetch_external_users", return_value=mock_users)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/ingest-external?domain=customers")

    assert response.status_code == 200
    assert response.json()["count"] == 1


@pytest.mark.asyncio
async def test_ingest_external_products(override_get_db, mocker):
    mock_products = [{"name": "Widget", "value": 9.99, "category": "Products",
                      "source_system": "ERP", "status": "Golden", "data_quality_score": 100}]
    mocker.patch("api.index._fetch_external_products", return_value=mock_products)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/ingest-external?domain=products")

    assert response.status_code == 200
    assert response.json()["count"] == 1


# ===========================================================================
# 7. GET /api/deduplicate
# ===========================================================================

@pytest.mark.asyncio
async def test_deduplicate_finds_similar(override_get_db):
    rows = [
        MagicMock(id=1, name="Product A", category="Cat", source_system="S", data_quality_score=100, status="Golden"),
        MagicMock(id=2, name="Product A ", category="Cat", source_system="S", data_quality_score=95, status="Golden"),
    ]
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = rows
    override_get_db.execute.return_value = mock_result

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/deduplicate")

    assert response.status_code == 200
    assert len(response.json()) >= 1


@pytest.mark.asyncio
async def test_deduplicate_no_duplicates(override_get_db):
    rows = [
        MagicMock(id=1, name="Apple", category="Fruit", source_system="S", data_quality_score=100, status="Golden"),
        MagicMock(id=2, name="Banana", category="Fruit", source_system="S", data_quality_score=100, status="Golden"),
    ]
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = rows
    override_get_db.execute.return_value = mock_result

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/deduplicate")

    assert response.status_code == 200
    assert response.json() == []


# ===========================================================================
# 8. POST /api/merge
# ===========================================================================

@pytest.mark.asyncio
async def test_merge_records_success(override_get_db):
    prim = MagicMock(id=1, value=50.0, status="Golden", data_quality_score=90)
    dup  = MagicMock(id=2, value=80.0)

    call_count = {"n": 0}

    def side_effect(*args, **kwargs):
        result = MagicMock()
        n = call_count["n"]
        call_count["n"] += 1
        if n == 0:
            result.scalar_one_or_none.return_value = prim
        elif n == 1:
            result.scalar_one_or_none.return_value = dup
        else:
            result.scalar_one_or_none.return_value = None
        return result

    override_get_db.execute = AsyncMock(side_effect=side_effect)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/merge", json={"primary_id": 1, "duplicate_id": 2})

    assert response.status_code == 200
    assert "merged" in response.json()["message"]


@pytest.mark.asyncio
async def test_merge_records_not_found(override_get_db):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    override_get_db.execute.return_value = mock_result

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/merge", json={"primary_id": 999, "duplicate_id": 888})

    assert response.status_code == 404


# ===========================================================================
# 9. Auth endpoints
# ===========================================================================

@pytest.mark.asyncio
async def test_auth_signup(mocker):
    mocker.patch("api.index.get_jwt_secret", return_value="a" * 64)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/auth/signup",
            json={"email": "user@test.com", "password": "testpassword123", "full_name": "Test User", "role": "admin"},
        )

    assert response.status_code == 200
    assert "access_token" in response.json()


@pytest.mark.asyncio
async def test_auth_login(mocker):
    mocker.patch("api.index.get_jwt_secret", return_value="a" * 64)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/auth/login",
            json={"email": "user@test.com", "password": "testpassword123"},
        )

    assert response.status_code == 200
    assert "access_token" in response.json()


@pytest.mark.asyncio
async def test_auth_logout():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/auth/logout")

    assert response.status_code == 200
    assert response.json()["message"] == "Logged out successfully"


@pytest.mark.asyncio
async def test_auth_me_valid_token(override_require_auth):
    from jose import jwt as jose_jwt
    secret = "a" * 64
    token = jose_jwt.encode({"sub": "test@example.com", "role": "admin"}, secret, algorithm="HS256")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json()["sub"] == "test@example.com"


@pytest.mark.asyncio
async def test_auth_me_missing_token():
    # Remove override so the real require_auth runs
    from api.security import require_auth
    app.dependency_overrides.pop(require_auth, None)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/auth/me")

    assert response.status_code == 401


# ===========================================================================
# 10. Settings
# ===========================================================================

@pytest.mark.asyncio
async def test_get_settings(override_get_db, mock_redis_global):
    mock_redis_global.get.return_value = json.dumps(DEFAULT_SETTINGS)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/settings")

    assert response.status_code == 200
    data = response.json()
    assert data["fuzzy_threshold"] == 75


@pytest.mark.asyncio
async def test_update_settings_valid(override_get_db, override_require_auth):
    override_get_db.execute.return_value = AsyncMock()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/settings",
            json={"fuzzy_threshold": 80, "golden_quality_threshold": 85, "auto_merge": True, "redis_cache_ttl": 120},
            headers={"Authorization": "Bearer mock"},
        )

    assert response.status_code == 200
    assert response.json()["message"] == "Settings updated successfully"


@pytest.mark.asyncio
async def test_update_settings_invalid_fuzzy_threshold(override_require_auth):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/settings",
            json={"fuzzy_threshold": 20, "golden_quality_threshold": 80, "auto_merge": True, "redis_cache_ttl": 60},
            headers={"Authorization": "Bearer mock"},
        )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_update_settings_invalid_ttl(override_require_auth):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/settings",
            json={"fuzzy_threshold": 75, "golden_quality_threshold": 80, "auto_merge": True, "redis_cache_ttl": 0},
            headers={"Authorization": "Bearer mock"},
        )
    assert response.status_code == 400


# ===========================================================================
# 11. Cache purge
# ===========================================================================

@pytest.mark.asyncio
async def test_purge_cache(override_get_db, override_require_auth, mock_redis_global):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/cache/purge", headers={"Authorization": "Bearer mock"})

    assert response.status_code == 200
    assert response.json()["message"] == "Cache purged successfully"
    mock_redis_global.delete.assert_called()


# ===========================================================================
# 12. Audit logs
# ===========================================================================

@pytest.mark.asyncio
async def test_get_audit_logs(override_get_db):
    mock_row = {"id": 1, "action": "TEST", "details": "detail", "actor": "System", "created_at": "2026-01-01"}
    mock_result = MagicMock()
    mock_result.mappings.return_value.all.return_value = [mock_row]
    override_get_db.execute.return_value = mock_result

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/audit-logs")

    assert response.status_code == 200
    assert response.json()[0]["action"] == "TEST"


@pytest.mark.asyncio
async def test_get_audit_logs_db_error_returns_fallback(override_get_db):
    override_get_db.execute.side_effect = Exception("DB error")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/audit-logs")

    assert response.status_code == 200
    assert len(response.json()) >= 1
