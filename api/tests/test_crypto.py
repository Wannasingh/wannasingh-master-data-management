"""
-- ============================================================
-- File        : api/tests/test_crypto.py
-- Author      : wannasingh-mdm
-- Date        : 2026-06-23
-- Task/Jira   : MDM-TEST-002
-- Purpose     : Unit tests for the AES-256-GCM crypto module.
-- ============================================================
"""

import os
import pytest
from api.crypto import encrypt_payload, decrypt_payload


@pytest.fixture
def aes_key() -> bytes:
    """Return a fresh random 32-byte AES key for each test."""
    return os.urandom(32)


def test_encrypt_decrypt_roundtrip(aes_key):
    data = {"user": "test@example.com", "role": "admin"}
    token = encrypt_payload(data, aes_key)
    result = decrypt_payload(token, aes_key)
    assert result == data


def test_each_encryption_is_unique(aes_key):
    data = {"msg": "hello"}
    t1 = encrypt_payload(data, aes_key)
    t2 = encrypt_payload(data, aes_key)
    # Different nonces → different ciphertexts
    assert t1 != t2


def test_decrypt_with_wrong_key_raises(aes_key):
    data = {"secret": "value"}
    token = encrypt_payload(data, aes_key)
    wrong_key = os.urandom(32)
    with pytest.raises(ValueError, match="authentication failed"):
        decrypt_payload(token, wrong_key)


def test_invalid_key_length_raises():
    with pytest.raises(ValueError, match="32-byte"):
        encrypt_payload({"x": 1}, b"short_key")


def test_invalid_token_format_raises(aes_key):
    with pytest.raises(ValueError, match="Invalid encrypted token format"):
        decrypt_payload("no_dot_here", aes_key)


def test_tampered_ciphertext_raises(aes_key):
    data = {"msg": "tamper me"}
    token = encrypt_payload(data, aes_key)
    parts = token.split(".")
    # Corrupt the ciphertext part
    tampered = parts[0] + ".AAAA" + parts[1][4:]
    with pytest.raises(ValueError):
        decrypt_payload(tampered, aes_key)


def test_nested_data_roundtrip(aes_key):
    data = {"nested": {"list": [1, 2, 3], "flag": True, "num": 3.14}}
    result = decrypt_payload(encrypt_payload(data, aes_key), aes_key)
    assert result == data
