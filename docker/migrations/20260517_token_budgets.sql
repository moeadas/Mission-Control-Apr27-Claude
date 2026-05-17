-- Batch H — per-tenant token budgets + content defaults
--
-- Adds two pieces to the subscriptions row:
--   • monthly_token_budget_usd: hard cap (NULL = unlimited)
--   • monthly_token_warning_pct: soft alert threshold (default 80%)
--
-- And a tenant-level content-defaults blob on agencies.settings:
--   settings.contentDefaults = {
--     platforms: 'Instagram, LinkedIn',
--     postingFrequency: 'Instagram: 3 posts/week; LinkedIn: 2 posts/week',
--     campaignDuration: '30 days',
--     contentGoal: 'Awareness and lead generation',
--     posts: { perWeek: 3 },
--     ...
--   }
--
-- These replace the hardcoded values in autonomous-task.ts +
-- content-calendar-engine.ts. Tenants without a contentDefaults blob fall
-- back to the current defaults (no behavior change for existing data).
--
-- Apply on the VPS:
--   docker compose exec -T db psql -U mc_user -d mission_control \
--     < docker/migrations/20260517_token_budgets.sql

BEGIN;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS monthly_token_budget_usd  NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS monthly_token_warning_pct INT NOT NULL DEFAULT 80;

-- Sanity: warning percent in [10, 100]
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_warning_pct_check'
  ) THEN
    ALTER TABLE subscriptions
      ADD CONSTRAINT subscriptions_warning_pct_check
      CHECK (monthly_token_warning_pct BETWEEN 10 AND 100);
  END IF;
END$$;

COMMIT;
