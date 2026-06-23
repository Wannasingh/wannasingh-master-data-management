/**
 * ============================================================
 * File        : src/lib/crypto.ts
 * Author      : wannasingh-mdm
 * Date        : 2026-06-23
 * Task/Jira   : MDM-ENC-003
 * Purpose     : Browser-side AES-256-GCM encryption helpers
 *               using the native Web Crypto API (zero dependencies).
 *               Encrypts request bodies before sending to sensitive
 *               API endpoints and decrypts encrypted API responses.
 * ============================================================
 */

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96-bit nonce for GCM

// ---------------------------------------------------------------------------
// Key import
// ---------------------------------------------------------------------------

/**
 * Import a raw 32-byte AES-256-GCM key from a hex string.
 *
 * @param hexKey - 64-character hex string representing the 32-byte key.
 */
export async function importKey(hexKey: string): Promise<CryptoKey> {
  if (hexKey.length !== 64) {
    throw new Error("AES-256 key must be 64 hex characters (32 bytes).");
  }
  const raw = hexToBytes(hexKey);
  return crypto.subtle.importKey("raw", raw, { name: ALGORITHM, length: KEY_LENGTH }, false, [
    "encrypt",
    "decrypt",
  ]);
}

// ---------------------------------------------------------------------------
// Encrypt
// ---------------------------------------------------------------------------

/**
 * Encrypt a JSON-serialisable value with AES-256-GCM.
 *
 * @param data   - Any JSON-serialisable payload.
 * @param key    - CryptoKey (256-bit AES-GCM).
 * @returns      - Dot-delimited Base64url string: `<iv>.<ciphertext+tag>`
 */
export async function encryptPayload(data: unknown, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));

  const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, plaintext);

  const ivB64 = bytesToBase64Url(iv);
  const ctB64 = bytesToBase64Url(new Uint8Array(ciphertext));
  return `${ivB64}.${ctB64}`;
}

// ---------------------------------------------------------------------------
// Decrypt
// ---------------------------------------------------------------------------

/**
 * Decrypt an AES-256-GCM token produced by the Python backend's `encrypt_payload`.
 *
 * @param token  - Dot-delimited Base64url string.
 * @param key    - CryptoKey (256-bit AES-GCM).
 * @returns      - Decoded JavaScript object.
 */
export async function decryptPayload<T = unknown>(token: string, key: CryptoKey): Promise<T> {
  const parts = token.split(".");
  if (parts.length !== 2) {
    throw new Error("Invalid token format. Expected '<iv>.<ciphertext>'.");
  }

  const iv = base64UrlToBytes(parts[0]);
  const ciphertext = base64UrlToBytes(parts[1]);

  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext);
  } catch {
    throw new Error("Payload decryption failed — ciphertext may be tampered or key mismatch.");
  }

  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ---------------------------------------------------------------------------
// Convenience: fetch wrapper that auto-encrypts the request body
// ---------------------------------------------------------------------------

/**
 * Wrapper around `fetch` that encrypts the request body and decrypts the
 * response for endpoints that use the `X-Encrypted: true` protocol.
 */
export async function encryptedFetch<TResponse = unknown>(
  url: string,
  payload: unknown,
  key: CryptoKey,
  init: RequestInit = {}
): Promise<TResponse> {
  const encryptedBody = await encryptPayload(payload, key);

  const response = await fetch(url, {
    ...init,
    method: init.method ?? "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Encrypted": "true",
      ...(init.headers as Record<string, string>),
    },
    body: JSON.stringify(encryptedBody),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error((err as { detail: string }).detail ?? `HTTP ${response.status}`);
  }

  const isEncrypted = response.headers.get("X-Encrypted") === "true";
  if (isEncrypted) {
    const token = (await response.json()) as string;
    return decryptPayload<TResponse>(token, key);
  }

  return response.json() as Promise<TResponse>;
}
