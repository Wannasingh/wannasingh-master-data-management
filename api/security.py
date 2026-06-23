"""
-- ============================================================
-- File        : api/security.py
-- Author      : wannasingh-mdm
-- Date        : 2026-06-23
-- Task/Jira   : MDM-SEC-001
-- Purpose     : Centralised security helpers — JWT validation,
--               RBAC role enforcement, and safe error responses.
--               No raw exception text is ever leaked to clients.
-- ============================================================
"""

from __future__ import annotations

import os
import logging
from functools import wraps
from typing import Callable, Optional, List

from fastapi import HTTPException, Header, Request, status
from fastapi.responses import JSONResponse
from jose import JWTError, jwt
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# JWT Configuration (injected from Vault / env at startup)
# ---------------------------------------------------------------------------
JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "")
JWT_ALGORITHM: str = "HS256"


class TokenPayload(BaseModel):
    sub: str
    role: Optional[str] = None
    exp: Optional[int] = None


# ---------------------------------------------------------------------------
# Token extraction helper
# ---------------------------------------------------------------------------

def _extract_bearer(authorization: Optional[str]) -> str:
    """Return the raw JWT string from an Authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header.",
        )
    return authorization.split(" ", 1)[1]


# ---------------------------------------------------------------------------
# JWT validation dependency (use as FastAPI Depends)
# ---------------------------------------------------------------------------

def require_auth(
    authorization: Optional[str] = Header(default=None),
) -> TokenPayload:
    """
    FastAPI dependency that validates the JWT in the Authorization header.

    Usage:
        @app.get("/protected")
        async def protected(payload: TokenPayload = Depends(require_auth)):
            ...
    """
    token = _extract_bearer(authorization)
    if not JWT_SECRET_KEY:
        logger.error("JWT_SECRET_KEY is not configured.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is not configured.",
        )
    try:
        claims = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return TokenPayload(**claims)
    except JWTError as exc:
        logger.warning("JWT validation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        )


# ---------------------------------------------------------------------------
# RBAC role enforcement
# ---------------------------------------------------------------------------

def require_roles(allowed_roles: List[str]) -> Callable:
    """
    Dependency factory that enforces role-based access.

    Usage:
        @app.delete("/admin-only")
        async def admin_action(
            payload: TokenPayload = Depends(require_roles(["admin"]))
        ):
            ...
    """
    def _dependency(
        authorization: Optional[str] = Header(default=None),
    ) -> TokenPayload:
        payload = require_auth(authorization)
        if payload.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return payload

    return _dependency


# ---------------------------------------------------------------------------
# Safe error response — never expose raw exception text to clients
# ---------------------------------------------------------------------------

def safe_error(exc: Exception, status_code: int = 500) -> JSONResponse:
    """
    Return a sanitised JSON error response.
    The raw exception is logged server-side only.
    """
    logger.error("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=status_code,
        content={"detail": "An internal error occurred. Please try again later."},
    )


# ---------------------------------------------------------------------------
# Global exception handler (register on FastAPI app)
# ---------------------------------------------------------------------------

async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return safe_error(exc, status_code=500)
