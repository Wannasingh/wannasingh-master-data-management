#!/usr/bin/env bash
# ============================================================
# File        : scripts/vault-setup.sh
# Author      : wannasingh-mdm
# Date        : 2026-06-23
# Task/Jira   : MDM-VAULT-001
# Purpose     : One-time HashiCorp Vault setup script.
#               Run this on the Vault server (or locally with
#               VAULT_ADDR pointed at the target) to:
#               1. Enable KV v2 secrets engine
#               2. Write all MDM secrets to Vault
#               3. Create a limited-access policy for the app
#               4. Issue an AppRole token for production
#
# Usage:
#   export VAULT_ADDR=https://your-vault-server:8200
#   export VAULT_TOKEN=<root or admin token>
#   bash scripts/vault-setup.sh
# ============================================================

set -euo pipefail

MOUNT="secret"
APP_NAME="wannasingh-mdm"

echo "🔐 Setting up Vault secrets for ${APP_NAME}..."

# ── 1. Enable KV v2 (idempotent) ──────────────────────────────
vault secrets enable -path="${MOUNT}" kv-v2 2>/dev/null || \
    echo "  KV v2 already enabled at ${MOUNT}/"

# ── 2. Write MDM secrets ───────────────────────────────────────
echo "  Writing database credentials..."
vault kv put "${MOUNT}/mdm/database" \
    DATABASE_URL="postgresql+asyncpg://mdm_user:REPLACE_ME_DB_PASSWORD@64.110.115.33:5432/mdm_db"

echo "  Writing Redis credentials..."
vault kv put "${MOUNT}/mdm/redis" \
    REDIS_URL="redis://:REPLACE_ME@64.110.115.33:6379/0"

echo "  Writing JWT secret..."
JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
vault kv put "${MOUNT}/mdm/jwt" \
    JWT_SECRET_KEY="${JWT_SECRET}"

echo "  Writing AES-256 encryption key..."
ENC_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
vault kv put "${MOUNT}/mdm/encryption" \
    PAYLOAD_ENCRYPTION_KEY="${ENC_KEY}"


# ── 3. Create app policy ───────────────────────────────────────
echo "  Creating Vault policy..."
vault policy write "${APP_NAME}" - <<EOF
# Policy for wannasingh-mdm application
# Allows read-only access to all MDM secrets

path "${MOUNT}/data/mdm/*" {
  capabilities = ["read"]
}

path "${MOUNT}/metadata/mdm/*" {
  capabilities = ["list"]
}
EOF

# ── 4. Enable AppRole and create role ─────────────────────────
echo "  Enabling AppRole auth..."
vault auth enable approle 2>/dev/null || echo "  AppRole already enabled"

vault write auth/approle/role/"${APP_NAME}" \
    secret_id_ttl=0 \
    token_num_uses=0 \
    token_ttl=1h \
    token_max_ttl=4h \
    token_policies="${APP_NAME}"

ROLE_ID=$(vault read -field=role_id auth/approle/role/"${APP_NAME}"/role-id)
SECRET_ID=$(vault write -field=secret_id -f auth/approle/role/"${APP_NAME}"/secret-id)

echo ""
echo "✅ Vault setup complete!"
echo ""
echo "━━━ Add the following to Jenkins Credentials ━━━"
echo "  Credential ID : vault-token"
echo "  Role ID       : ${ROLE_ID}"
echo "  Secret ID     : ${SECRET_ID}"
echo ""
echo "  To get a token manually:"
echo "  vault write auth/approle/login role_id=${ROLE_ID} secret_id=${SECRET_ID}"
echo ""
echo "⚠️  IMPORTANT: Replace all REPLACE_ME values above with real credentials."
echo "   Do NOT commit this script's output to Git."
