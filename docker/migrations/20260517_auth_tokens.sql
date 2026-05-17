-- Batch E — auth-token tables.
--
-- Single-use tokens for email verification, password reset, and tenant
-- invitations. Each table has:
--   • token: random URL-safe string (we generate via crypto.randomBytes)
--   • expires_at: hard expiry
--   • consumed_at: timestamp when the token was used (null = still valid)
--   • single FK back to the relevant entity (users / agencies)
--
-- Apply on the VPS:
--   docker compose exec -T db psql -U mc_user -d mission_control \
--     < docker/migrations/20260517_auth_tokens.sql

BEGIN;

-- ─── Email verification ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  token        TEXT PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  consumed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_user      ON email_verification_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_unconsumed
  ON email_verification_tokens (expires_at)
  WHERE consumed_at IS NULL;

-- ─── Password reset ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token        TEXT PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at   TIMESTAMPTZ NOT NULL,
  consumed_at  TIMESTAMPTZ,
  request_ip   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user        ON password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_unconsumed
  ON password_reset_tokens (expires_at)
  WHERE consumed_at IS NULL;

-- ─── Tenant invitations ────────────────────────────────────────────────────
-- A pending invite stays "open" until either accepted (consumed_at set) or
-- expired (expires_at < now()). The invitee creates their account (or signs
-- in if they already have one) via the link, which calls
-- POST /api/tenant/invitations/accept with the token.
CREATE TABLE IF NOT EXISTS tenant_invitations (
  token         TEXT PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'member'
                  CHECK (role IN ('admin','member')),
  invited_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  consumed_at   TIMESTAMPTZ,
  accepted_user UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_invitations_tenant ON tenant_invitations (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_email  ON tenant_invitations (lower(email)) WHERE consumed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_pending
  ON tenant_invitations (expires_at)
  WHERE consumed_at IS NULL;

-- ─── Rate-limit buckets ────────────────────────────────────────────────────
-- Per-bucket counter that the rate-limit helper uses when no in-memory state
-- exists (e.g. across server restarts). Buckets are pruned by the helper
-- itself when they expire.
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  bucket_key   TEXT PRIMARY KEY,           -- "<route>:<ip-or-userId>"
  count        INT  NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_window_start ON rate_limit_buckets (window_start);

COMMIT;
