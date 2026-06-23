"""
-- ============================================================
-- File        : api/crypto.py
-- Author      : wannasingh-mdm
-- Date        : 2026-06-23
-- Task/Jira   : MDM-ENC-001
-- Purpose     : AES-256-GCM authenticated encryption helpers
--               for API request/response payload protection.
--               Each message uses a random 96-bit nonce so
--               identical plaintexts produce distinct ciphertexts.
-- ============================================================
"""

from __future__ import annotations

import base64
import json
import os
from typing import Any, Dict

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

NONCE_BYTES: int = 12  # 96-bit nonce — recommended for GCM
TAG_BITS: int = 128     # 128-bit auth tag (GCM default)


# ---------------------------------------------------------------------------
# Core encrypt / decrypt
# ---------------------------------------------------------------------------

def encrypt_payload(data: Dict[str, Any], key: bytes) -> str:
    """
    Encrypt a JSON-serialisable dict with AES-256-GCM.

    Returns a Base64-encoded string in the format::

        <base64(nonce)>.<base64(ciphertext+tag)>

    Parameters
    ----------
    data : Serialisable dict (the plaintext payload).
    key  : 32-byte AES-256 key.

    Returns
    -------
    Dot-delimited Base64 string safe to transmit as an HTTP body or header.
    """
    if len(key) != 32:
        raise ValueError("AES-256 requires a 32-byte key.")

    plaintext: bytes = json.dumps(data, ensure_ascii=False).encode("utf-8")
    nonce: bytes = os.urandom(NONCE_BYTES)

    aesgcm = AESGCM(key)
    ciphertext: bytes = aesgcm.encrypt(nonce, plaintext, associated_data=None)

    nonce_b64 = base64.urlsafe_b64encode(nonce).decode("ascii")
    cipher_b64 = base64.urlsafe_b64encode(ciphertext).decode("ascii")
    return f"{nonce_b64}.{cipher_b64}"


def decrypt_payload(token: str, key: bytes) -> Dict[str, Any]:
    """
    Decrypt an AES-256-GCM token produced by :func:`encrypt_payload`.

    Parameters
    ----------
    token : Dot-delimited Base64 string from :func:`encrypt_payload`.
    key   : 32-byte AES-256 key.

    Returns
    -------
    Decoded Python dict.

    Raises
    ------
    ValueError  : If the token format is wrong or authentication fails.
    """
    if len(key) != 32:
        raise ValueError("AES-256 requires a 32-byte key.")

    parts = token.split(".", 1)
    if len(parts) != 2:
        raise ValueError("Invalid encrypted token format. Expected '<nonce>.<ciphertext>'.")

    try:
        nonce: bytes = base64.urlsafe_b64decode(parts[0])
        ciphertext: bytes = base64.urlsafe_b64decode(parts[1])
    except Exception as exc:
        raise ValueError(f"Token Base64 decode failed: {exc}") from exc

    aesgcm = AESGCM(key)
    try:
        plaintext: bytes = aesgcm.decrypt(nonce, ciphertext, associated_data=None)
    except Exception as exc:
        raise ValueError("Payload authentication failed — ciphertext may be tampered.") from exc

    return json.loads(plaintext.decode("utf-8"))


# ---------------------------------------------------------------------------
# Convenience wrappers that load the key from Vault at call time
# ---------------------------------------------------------------------------

def encrypt_with_vault_key(data: Dict[str, Any]) -> str:
    """Encrypt using the key fetched from Vault (lazy import to avoid circular deps)."""
    from api.vault_client import get_payload_encryption_key  # noqa: PLC0415

    return encrypt_payload(data, get_payload_encryption_key())


def decrypt_with_vault_key(token: str) -> Dict[str, Any]:
    """Decrypt using the key fetched from Vault (lazy import to avoid circular deps)."""
    from api.vault_client import get_payload_encryption_key  # noqa: PLC0415

    return decrypt_payload(token, get_payload_encryption_key())
