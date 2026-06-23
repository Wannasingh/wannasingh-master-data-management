"""
-- ============================================================
-- File        : api/vault_client.py
-- Author      : wannasingh-mdm
-- Date        : 2026-06-23
-- Task/Jira   : MDM-VAULT-001
-- Purpose     : HashiCorp Vault KV v2 wrapper.
--               Fetches secrets at runtime so no credentials
--               are baked into images or config files.
--               Falls back to environment variables for local
--               development when VAULT_ADDR is not set.
-- ============================================================
"""

from __future__ import annotations

import logging
import os
from functools import lru_cache
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Optional hvac import — gracefully degrade when library is absent (local dev)
# ---------------------------------------------------------------------------
try:
    import hvac  # type: ignore

    _HVAC_AVAILABLE = True
except ImportError:
    _HVAC_AVAILABLE = False
    logger.warning(
        "hvac library not installed. Vault integration disabled; "
        "falling back to environment variables."
    )


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

VAULT_ADDR: str = os.getenv("VAULT_ADDR", "https://vault.wannasingh.dev")
VAULT_TOKEN: str = os.getenv("VAULT_TOKEN", "")
VAULT_NAMESPACE: str = os.getenv("VAULT_NAMESPACE", "")  # Enterprise namespaces
VAULT_MOUNT_POINT: str = os.getenv("VAULT_MOUNT_POINT", "secret")


# ---------------------------------------------------------------------------
# Client factory
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def _get_vault_client() -> Optional[object]:
    """Return an authenticated hvac client, or None if Vault is unavailable."""
    if not _HVAC_AVAILABLE or not VAULT_ADDR or not VAULT_TOKEN:
        return None
    try:
        client = hvac.Client(
            url=VAULT_ADDR,
            token=VAULT_TOKEN,
            namespace=VAULT_NAMESPACE or None,
        )
        if not client.is_authenticated():
            logger.error("Vault client is not authenticated. Check VAULT_TOKEN.")
            return None
        logger.info("Vault client authenticated successfully (addr=%s).", VAULT_ADDR)
        return client
    except Exception as exc:
        logger.error("Failed to initialise Vault client: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_secret(path: str, key: str, env_fallback: Optional[str] = None) -> str:
    """
    Fetch a secret value from Vault KV v2.

    Parameters
    ----------
    path        : Vault KV path, e.g. ``"mdm/database"``.
    key         : The key inside the secret, e.g. ``"DATABASE_URL"``.
    env_fallback: Environment variable name to fall back to when Vault is
                  unavailable (useful for local development).

    Returns
    -------
    The secret value as a string.

    Raises
    ------
    RuntimeError if neither Vault nor the env fallback can provide the value.
    """
    client = _get_vault_client()

    if client is not None:
        try:
            response = client.secrets.kv.v2.read_secret_version(  # type: ignore[attr-defined]
                path=path,
                mount_point=VAULT_MOUNT_POINT,
                raise_on_deleted_version=True,
            )
            value: str = response["data"]["data"][key]
            logger.debug("Secret '%s/%s' fetched from Vault.", path, key)
            return value
        except Exception as exc:
            logger.error(
                "Failed to read secret '%s/%s' from Vault: %s. "
                "Attempting env fallback.",
                path,
                key,
                exc,
            )

    # Env var fallback
    if env_fallback:
        value = os.getenv(env_fallback, "")
        if value:
            logger.debug("Secret '%s/%s' resolved from env var '%s'.", path, key, env_fallback)
            return value

    raise RuntimeError(
        f"Secret '{path}/{key}' could not be resolved from Vault or environment. "
        "Ensure VAULT_ADDR, VAULT_TOKEN are set, or provide the env fallback variable."
    )


# ---------------------------------------------------------------------------
# Convenience helpers for known MDM secrets
# ---------------------------------------------------------------------------

def get_database_url() -> str:
    return get_secret("mdm/database", "DATABASE_URL", env_fallback="DATABASE_URL")


def get_redis_url() -> str:
    return get_secret("mdm/redis", "REDIS_URL", env_fallback="REDIS_URL")


def get_jwt_secret() -> str:
    return get_secret("mdm/jwt", "JWT_SECRET_KEY", env_fallback="JWT_SECRET_KEY")


def get_payload_encryption_key() -> bytes:
    """Return the 32-byte AES-256 key as raw bytes."""
    raw = get_secret("mdm/encryption", "PAYLOAD_ENCRYPTION_KEY", env_fallback="PAYLOAD_ENCRYPTION_KEY")
    key_bytes = bytes.fromhex(raw) if len(raw) == 64 else raw.encode()
    if len(key_bytes) != 32:
        raise RuntimeError(
            "PAYLOAD_ENCRYPTION_KEY must be exactly 32 bytes (64 hex chars or 32 ASCII chars)."
        )
    return key_bytes
