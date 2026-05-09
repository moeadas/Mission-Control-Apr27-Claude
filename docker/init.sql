-- Mission Control — PostgreSQL schema
-- This file runs automatically on first container start (docker-entrypoint-initdb.d)

-- ─── Auth ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'member',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK from agencies to users now that users table exists
ALTER TABLE agencies
  ADD CONSTRAINT IF NOT EXISTS fk_agencies_owner_user_id
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'member',
  is_active  BOOLEAN NOT NULL DEFAULT true,
  full_name  TEXT,
  tenant_id  UUID REFERENCES agencies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles (tenant_id);

-- ─── Core state blob ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mission_control_state (
  agency_id  TEXT PRIMARY KEY,
  state      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Plans ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plans (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  max_agents        INT  NOT NULL DEFAULT 3,
  price_monthly_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  stripe_price_id   TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO plans (id, name, max_agents, price_monthly_usd) VALUES
  ('free',       'Free',       3,   0),
  ('starter',    'Starter',    10,  49),
  ('growth',     'Growth',     25,  99),
  ('enterprise', 'Enterprise', -1,  299)
ON CONFLICT (id) DO NOTHING;

-- ─── Relational tables ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agencies (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           TEXT UNIQUE NOT NULL,
  name           TEXT NOT NULL,
  settings       JSONB NOT NULL DEFAULT '{}',
  owner_user_id  UUID,                            -- FK added after users table
  plan_id        TEXT REFERENCES plans(id) DEFAULT 'free',
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agents (
  id               TEXT PRIMARY KEY,
  agency_id        UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  role             TEXT,
  division         TEXT,
  specialty        TEXT,
  unit             TEXT,
  status           TEXT,
  bio              TEXT DEFAULT '',
  methodology      TEXT DEFAULT '',
  system_prompt    TEXT DEFAULT '',
  provider         TEXT,
  model            TEXT,
  temperature      NUMERIC,
  max_tokens       INT,
  color            TEXT,
  accent_color     TEXT,
  avatar           TEXT,
  photo_url        TEXT,
  current_task     TEXT,
  workload         NUMERIC,
  last_active      TEXT,
  tools            JSONB DEFAULT '[]',
  skills           JSONB DEFAULT '[]',
  responsibilities JSONB DEFAULT '[]',
  primary_outputs  JSONB DEFAULT '[]',
  position         JSONB DEFAULT '{}',
  metadata         JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS clients (
  id                TEXT PRIMARY KEY,
  agency_id         UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  industry          TEXT,
  website           TEXT,
  status            TEXT DEFAULT 'active',
  owner_user_id     UUID REFERENCES users(id),
  brief             JSONB DEFAULT '{}',
  knowledge_summary TEXT,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS skills (
  id          TEXT PRIMARY KEY,
  agency_id   UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  category    TEXT,
  description TEXT DEFAULT '',
  prompts     JSONB DEFAULT '{}',
  checklist   JSONB DEFAULT '[]',
  examples    JSONB DEFAULT '[]',
  metadata    JSONB DEFAULT '{}',
  source      TEXT DEFAULT 'config'
);

CREATE TABLE IF NOT EXISTS pipelines (
  id                 TEXT PRIMARY KEY,
  agency_id          UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  description        TEXT DEFAULT '',
  version            TEXT DEFAULT '1.0',
  is_default         BOOLEAN DEFAULT false,
  estimated_duration TEXT,
  definition         JSONB DEFAULT '{}',
  source             TEXT DEFAULT 'config'
);

CREATE TABLE IF NOT EXISTS tasks (
  id               TEXT PRIMARY KEY,
  agency_id        UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id        TEXT REFERENCES clients(id),
  title            TEXT NOT NULL,
  summary          TEXT DEFAULT '',
  deliverable_type TEXT,
  status           TEXT,
  priority         TEXT,
  owner_user_id    UUID REFERENCES users(id),
  assigned_by      TEXT,
  lead_agent_id    TEXT,
  pipeline_id      TEXT,
  progress         NUMERIC DEFAULT 0,
  due_date         TEXT,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  execution_plan   JSONB DEFAULT '{}',
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS task_assignments (
  id            SERIAL PRIMARY KEY,
  agency_id     UUID NOT NULL,
  task_id       TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  agent_id      TEXT NOT NULL,
  role          TEXT,
  status        TEXT,
  handoff_notes TEXT
);

CREATE TABLE IF NOT EXISTS outputs (
  id               TEXT PRIMARY KEY,
  agency_id        UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  task_id          TEXT REFERENCES tasks(id),
  client_id        TEXT REFERENCES clients(id),
  agent_id         TEXT,
  title            TEXT NOT NULL,
  deliverable_type TEXT,
  status           TEXT,
  owner_user_id    UUID REFERENCES users(id),
  format           TEXT,
  content          TEXT,
  rendered_html    TEXT,
  source_prompt    TEXT,
  notes            TEXT,
  storage_path     TEXT,
  public_url       TEXT,
  creative         JSONB DEFAULT '{}',
  exports          JSONB DEFAULT '[]',
  execution_steps  JSONB DEFAULT '[]',
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS conversations (
  id            TEXT PRIMARY KEY,
  agency_id     UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id     TEXT,
  task_id       TEXT,
  title         TEXT NOT NULL,
  preview       TEXT,
  agent_id      TEXT,
  owner_user_id UUID REFERENCES users(id),
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,
  agent_id        TEXT,
  content         TEXT NOT NULL,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS knowledge_assets (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id      UUID NOT NULL,
  client_id      TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  asset_type     TEXT,
  storage_bucket TEXT,
  storage_path   TEXT,
  public_url     TEXT,
  extracted_text TEXT,
  summary        TEXT,
  metadata       JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ,
  updated_at     TIMESTAMPTZ
);

-- ─── Subscriptions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  plan_id                TEXT NOT NULL REFERENCES plans(id),
  status                 TEXT NOT NULL DEFAULT 'active',
  stripe_subscription_id TEXT,
  stripe_customer_id     TEXT,
  agent_limit            INT  NOT NULL DEFAULT 3,
  current_agent_count    INT  NOT NULL DEFAULT 0,
  billing_cycle_start    TIMESTAMPTZ,
  billing_cycle_end      TIMESTAMPTZ,
  trial_ends_at          TIMESTAMPTZ,
  canceled_at            TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON subscriptions (tenant_id);

-- ─── Convenience view ──────────────────────────────────────────────────────
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
    s.status            AS subscription_status,
    s.agent_limit,
    s.current_agent_count,
    s.stripe_customer_id
  FROM agencies a
  LEFT JOIN subscriptions s ON s.tenant_id = a.id;

-- ─── Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_agents_agency_id        ON agents        (agency_id);
CREATE INDEX IF NOT EXISTS idx_clients_agency_id       ON clients       (agency_id);
CREATE INDEX IF NOT EXISTS idx_tasks_agency_id         ON tasks         (agency_id);
CREATE INDEX IF NOT EXISTS idx_outputs_agency_id       ON outputs       (agency_id);
CREATE INDEX IF NOT EXISTS idx_conversations_agency_id ON conversations  (agency_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_agency_id     ON knowledge_assets (agency_id);
