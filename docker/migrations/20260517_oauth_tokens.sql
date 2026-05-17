-- Batch G — per-user encrypted OAuth-token storage.
--
-- Stores Google / Meta / future-provider OAuth tokens after a successful
-- auth flow. `access_token` and `refresh_token` are written as encrypted
-- envelopes (the `*_encrypted` JSONB columns); the app decrypts on read
-- via PROVIDER_SECRETS_MASTER_KEY.
--
-- A composite UNIQUE on (user_id, provider) means each user has at most
-- one active token per provider — re-auth replaces the row.
--
-- Apply on the VPS:
--   docker compose exec -T db psql -U mc_user -d mission_control \
--     < docker/migrations/20260517_oauth_tokens.sql

BEGIN;

CREATE TABLE IF NOT EXISTS oauth_tokens (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider               TEXT NOT NULL,            -- 'google' | 'meta' | future
  account_email          TEXT,                     -- account-level identifier (informational)
  scope                  TEXT,
  access_token_encrypted JSONB,                    -- envelope; see secret-crypto.ts
  refresh_token_encrypted JSONB,
  expires_at             TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id  ON oauth_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_provider ON oauth_tokens (provider);

-- Auto-update updated_at on row update.
DROP TRIGGER IF EXISTS oauth_tokens_set_updated_at ON oauth_tokens;
CREATE TRIGGER oauth_tokens_set_updated_at
  BEFORE UPDATE ON oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_timestamp();

COMMIT;
