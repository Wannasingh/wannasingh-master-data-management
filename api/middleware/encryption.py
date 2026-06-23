"""
-- ============================================================
-- File        : api/middleware/encryption.py
-- Author      : wannasingh-mdm
-- Date        : 2026-06-23
-- Task/Jira   : MDM-ENC-002
-- Purpose     : FastAPI middleware that ENCRYPTS ALL API
--               request bodies and response payloads using
--               AES-256-GCM.
--
--               Coverage: ALL routes (no whitelist — encrypt
--               everything to prevent SQL injection pattern
--               scanning and payload tampering).
--
--               Clients indicate an encrypted request via:
--                   X-Encrypted: true
--
--               Server always returns encrypted JSON when
--               the response is 2xx and JSON-serialisable.
--
-- SQL-injection protection strategy:
--   1. Payload arrives encrypted → attacker cannot inject
--      raw SQL strings into the HTTP body.
--   2. Decrypted values are passed ONLY to SQLAlchemy
--      parameterised queries — never interpolated as strings.
--   3. Middleware rejects any request body whose decryption
--      fails (tamper detection via GCM auth tag).
-- ============================================================
"""

from __future__ import annotations

import json
import logging
from typing import Callable, Set

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from api.crypto import decrypt_payload, encrypt_payload
from api.vault_client import get_payload_encryption_key

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Routes that are EXCLUDED from encryption (health/infra endpoints)
# ---------------------------------------------------------------------------
ENCRYPTION_EXCLUDED_ROUTES: Set[str] = {
    "/docs",
    "/openapi.json",
    "/redoc",
    "/health",
    "/favicon.ico",
}

# Routes that accept PLAIN (unencrypted) requests — used during migration /
# for tooling (e.g. Postman). Remove once all clients support encryption.
ALLOW_PLAIN_REQUEST_ROUTES: Set[str] = set()   # Empty = all routes must be encrypted

_ENCRYPTED_HEADER       = "x-encrypted"
_ENCRYPTED_HEADER_VALUE = "true"

# Content-type prefix for JSON responses that should be encrypted
_JSON_CONTENT_TYPES = ("application/json",)


def _is_excluded(path: str) -> bool:
    return any(path.startswith(exc) for exc in ENCRYPTION_EXCLUDED_ROUTES)


class PayloadEncryptionMiddleware(BaseHTTPMiddleware):
    """
    Universal AES-256-GCM payload encryption middleware.

    Request flow:
        1. If ``X-Encrypted: true`` → decrypt body before routing.
        2. If plain body on a protected route → reject with 400.

    Response flow:
        3. On 2xx JSON response → encrypt body, add ``X-Encrypted: true``.
        4. On non-JSON / excluded routes → pass through unchanged.
    """

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path

        # ── Skip excluded infrastructure routes ────────────────
        if _is_excluded(path):
            return await call_next(request)

        # ── 1. Decrypt incoming request body ───────────────────
        is_encrypted_request = (
            request.headers.get(_ENCRYPTED_HEADER, "").lower() == _ENCRYPTED_HEADER_VALUE
        )
        content_type = request.headers.get("content-type", "")
        has_body_methods = request.method in ("POST", "PUT", "PATCH")

        if has_body_methods and content_type.startswith("application/json"):
            if is_encrypted_request:
                # Decrypt the body
                try:
                    raw_body = await request.body()
                    if raw_body:
                        body_str = raw_body.decode("utf-8").strip()
                        token = json.loads(body_str)
                        key = get_payload_encryption_key()
                        decrypted = decrypt_payload(token, key)
                        decrypted_bytes = json.dumps(decrypted).encode("utf-8")

                        async def new_receive():
                            return {"type": "http.request", "body": decrypted_bytes}

                        request = Request(request.scope, new_receive)
                except Exception as exc:
                    logger.warning(
                        "Failed to decrypt request body on %s: %s", path, exc
                    )
                    return JSONResponse(
                        status_code=400,
                        content={
                            "detail": "Request payload decryption failed. "
                                      "Send encrypted body with X-Encrypted: true."
                        },
                    )
            elif path not in ALLOW_PLAIN_REQUEST_ROUTES:
                # Plain JSON body on a protected route → reject
                # This blocks raw SQL injection attempts directly in body
                raw_body = await request.body()
                if raw_body:
                    logger.warning(
                        "Unencrypted request body rejected on %s from %s",
                        path,
                        request.client.host if request.client else "unknown",
                    )
                    return JSONResponse(
                        status_code=400,
                        content={
                            "detail": "Unencrypted request body is not accepted. "
                                      "Set X-Encrypted: true and send an AES-256-GCM "
                                      "encrypted payload."
                        },
                    )

        # ── 2. Call route handler ───────────────────────────────
        response: Response = await call_next(request)

        # ── 3. Encrypt JSON response on 2xx ────────────────────
        resp_content_type = response.headers.get("content-type", "")
        should_encrypt = (
            200 <= response.status_code < 300
            and any(resp_content_type.startswith(ct) for ct in _JSON_CONTENT_TYPES)
        )

        if should_encrypt:
            try:
                body_bytes = b""
                async for chunk in response.body_iterator:
                    body_bytes += chunk

                payload_dict = json.loads(body_bytes.decode("utf-8"))
                key = get_payload_encryption_key()
                encrypted_token = encrypt_payload(payload_dict, key)

                return JSONResponse(
                    content=encrypted_token,
                    status_code=response.status_code,
                    headers={
                        _ENCRYPTED_HEADER: _ENCRYPTED_HEADER_VALUE,
                        "X-Request-ID": request.headers.get("X-Request-ID", ""),
                    },
                )
            except Exception as exc:
                logger.error(
                    "Failed to encrypt response body on %s: %s", path, exc
                )
                # Return raw response rather than silently breaking API
                return response

        # Add traceability header to all responses
        response.headers["X-Request-ID"] = request.headers.get("X-Request-ID", "")
        return response
