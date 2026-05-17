-- ─── Output Share Tokens ─────────────────────────────────────────────────────
-- Adds opt-in public sharing for outputs. Without a share_token the /share/output
-- page refuses to render. Tokens are generated on demand via POST /api/outputs/:id/share
-- and expire by default 30 days after issue.
--
-- Apply on existing prod DB with:
--   docker compose exec -T db psql -U mc_user -d mission_control < docker/migrations/20260515_share_tokens.sql

ALTER TABLE outputs
  ADD COLUMN IF NOT EXISTS share_token        UUID,
  ADD COLUMN IF NOT EXISTS share_expires_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS share_created_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS share_created_by   UUID REFERENCES users(id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_outputs_share_token
  ON outputs (share_token)
  WHERE share_token IS NOT NULL;
