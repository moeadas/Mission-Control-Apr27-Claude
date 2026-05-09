-- ─────────────────────────────────────────────────────────────────────────────
-- Multi-Tenant SaaS Foundation
-- 2026-05-08
--
-- Strategy:
--   • agencies table = "tenants" (kept as-is for FK compatibility; exposed as
--     tenants via the application layer and a view alias)
--   • Add plans + subscriptions tables (Stripe-ready)
--   • Add tenant_id to profiles (links a user to their tenant)
--   • Add tenant_id alias columns to entity tables via ALTER TABLE
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Plans ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS plans (
  id                TEXT PRIMARY KEY,            -- 'free', 'starter', 'growth', 'enterprise'
  name              TEXT NOT NULL,
  max_agents        INT  NOT NULL DEFAULT 3,     -- -1 = unlimited
  price_monthly_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  stripe_price_id   TEXT,                        -- filled when Stripe is integrated
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default plans
INSERT INTO plans (id, name, max_agents, price_monthly_usd) VALUES
  ('free',       'Free',       3,   0),
  ('starter',    'Starter',    10,  49),
  ('growth',     'Growth',     25,  99),
  ('enterprise', 'Enterprise', -1,  299)
ON CONFLICT (id) DO NOTHING;

-- ─── Subscriptions ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  plan_id                 TEXT NOT NULL REFERENCES plans(id),
  status                  TEXT NOT NULL DEFAULT 'active',   -- active | trialing | past_due | canceled
  stripe_subscription_id  TEXT,
  stripe_customer_id      TEXT,
  agent_limit             INT  NOT NULL DEFAULT 3,          -- snapshot of plan.max_agents at subscribe time
  current_agent_count     INT  NOT NULL DEFAULT 0,
  billing_cycle_start     TIMESTAMPTZ,
  billing_cycle_end       TIMESTAMPTZ,
  trial_ends_at           TIMESTAMPTZ,
  canceled_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON subscriptions (tenant_id);

-- ─── Extend agencies to carry tenant metadata ─────────────────────────────

ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plan_id       TEXT REFERENCES plans(id) DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS is_active     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ NOT NULL DEFAULT now();

-- ─── Link profiles to their tenant ──────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS full_name  TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles (tenant_id);

-- ─── Convenience view: tenants (aliases agencies) ────────────────────────────

CREATE OR REPLACE VIEW tenants AS
  SELECT
    a.id,
    a.slug,
    a.name,
    a.settings,
    a.owner_user_id,
    a.plan_id,
    a.is_active,
    a.created_at,
    a.updated_at,
    s.status          AS subscription_status,
    s.agent_limit,
    s.current_agent_count,
    s.stripe_customer_id
  FROM agencies a
  LEFT JOIN subscriptions s ON s.tenant_id = a.id;

-- ─── Helper function: get or create subscription for a tenant ────────────────

CREATE OR REPLACE FUNCTION ensure_tenant_subscription(p_tenant_id UUID, p_plan_id TEXT DEFAULT 'free')
RETURNS void AS $$
BEGIN
  INSERT INTO subscriptions (tenant_id, plan_id, agent_limit)
  SELECT
    p_tenant_id,
    p_plan_id,
    max_agents
  FROM plans
  WHERE id = p_plan_id
  ON CONFLICT (tenant_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ─── Backfill: create free subscriptions for any existing tenants ─────────────

INSERT INTO subscriptions (tenant_id, plan_id, agent_limit)
SELECT
  a.id,
  COALESCE(a.plan_id, 'free'),
  (SELECT max_agents FROM plans WHERE id = COALESCE(a.plan_id, 'free'))
FROM agencies a
WHERE NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.tenant_id = a.id)
ON CONFLICT DO NOTHING;

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_agents_agency_id       ON agents       (agency_id);
CREATE INDEX IF NOT EXISTS idx_clients_agency_id      ON clients      (agency_id);
CREATE INDEX IF NOT EXISTS idx_tasks_agency_id        ON tasks        (agency_id);
CREATE INDEX IF NOT EXISTS idx_outputs_agency_id      ON outputs      (agency_id);
CREATE INDEX IF NOT EXISTS idx_conversations_agency_id ON conversations (agency_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_agency_id    ON knowledge_assets (agency_id);
