-- Mission Control — PostgreSQL schema (self-hosted)
-- This file runs automatically on first container start (docker-entrypoint-initdb.d).
-- For schema changes against an already-deployed DB, write a one-off migration
-- under docker/migrations/<date>_<name>.sql and apply manually via psql.

-- ─── Extensions ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Trigger function: keep updated_at fresh on every UPDATE ────────────────
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── Auth: users + plans + agencies + profiles ──────────────────────────────
-- Order matters: users must exist before agencies references it, agencies must
-- exist before profiles references it, plans must exist before subscriptions
-- references it.

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'member',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  email_verified_at TIMESTAMPTZ,                            -- Batch E: populated by verification flow
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));

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

-- Agencies = tenants. `owner_user_id` FK is defined inline now that users exists.
CREATE TABLE IF NOT EXISTS agencies (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           TEXT UNIQUE NOT NULL,
  name           TEXT NOT NULL,
  settings       JSONB NOT NULL DEFAULT '{}',
  owner_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  plan_id        TEXT REFERENCES plans(id) DEFAULT 'free',
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

-- ─── Core state blob (legacy single-row-per-tenant cache) ──────────────────
CREATE TABLE IF NOT EXISTS mission_control_state (
  agency_id  TEXT PRIMARY KEY,
  state      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Subscriptions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  plan_id                    TEXT NOT NULL REFERENCES plans(id),
  status                     TEXT NOT NULL DEFAULT 'active',
  stripe_subscription_id     TEXT,
  stripe_customer_id         TEXT,
  agent_limit                INT  NOT NULL DEFAULT 3,
  current_agent_count        INT  NOT NULL DEFAULT 0,
  billing_cycle_start        TIMESTAMPTZ,
  billing_cycle_end          TIMESTAMPTZ,
  trial_ends_at              TIMESTAMPTZ,
  canceled_at                TIMESTAMPTZ,
  monthly_token_budget_usd   NUMERIC(10, 2),
  monthly_token_warning_pct  INT NOT NULL DEFAULT 80 CHECK (monthly_token_warning_pct BETWEEN 10 AND 100),
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON subscriptions (tenant_id);

-- Convenience view: tenants (aliases agencies + subscription details)
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

-- ─── Domain: agents ─────────────────────────────────────────────────────────
-- Agents are DB-backed per tenant (Batch D refactor); the on-disk JSON files
-- under src/config/agents are templates the tenant can clone into their roster.
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
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Domain: clients ────────────────────────────────────────────────────────
-- assigned_user_ids implements per-resource ACL:
--   empty array  → shared with the whole tenant (default)
--   non-empty    → visible only to listed users + tenant admins / super_admin
CREATE TABLE IF NOT EXISTS clients (
  id                TEXT PRIMARY KEY,
  agency_id         UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  industry          TEXT,
  website           TEXT,
  status            TEXT DEFAULT 'active',
  owner_user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_user_ids UUID[] NOT NULL DEFAULT '{}',
  brief             JSONB DEFAULT '{}',
  knowledge_summary TEXT,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_assigned_user_ids ON clients USING GIN (assigned_user_ids);

-- ─── Domain: skills ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skills (
  id          TEXT NOT NULL,
  agency_id   UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  category    TEXT,
  description TEXT DEFAULT '',
  prompts     JSONB DEFAULT '{}',
  checklist   JSONB DEFAULT '[]',
  examples    JSONB DEFAULT '[]',
  metadata    JSONB DEFAULT '{}',
  source      TEXT DEFAULT 'config',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (agency_id, id)
);

-- ─── Domain: pipelines ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pipelines (
  id                 TEXT NOT NULL,
  agency_id          UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  description        TEXT DEFAULT '',
  version            TEXT DEFAULT '1.0',
  is_default         BOOLEAN DEFAULT false,
  estimated_duration TEXT,
  definition         JSONB DEFAULT '{}',
  source             TEXT DEFAULT 'config',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (agency_id, id)
);

-- ─── Domain: tasks ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id               TEXT PRIMARY KEY,
  agency_id        UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id        TEXT REFERENCES clients(id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  summary          TEXT DEFAULT '',
  deliverable_type TEXT,
  status           TEXT,
  priority         TEXT,
  owner_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_user_ids UUID[] NOT NULL DEFAULT '{}',
  assigned_by      TEXT,
  lead_agent_id    TEXT REFERENCES agents(id) ON DELETE SET NULL,
  pipeline_id      TEXT,
  progress         NUMERIC DEFAULT 0,
  due_date         TEXT,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  execution_plan   JSONB DEFAULT '{}',
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (agency_id, pipeline_id) REFERENCES pipelines(agency_id, id) ON DELETE SET NULL (pipeline_id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_user_ids ON tasks USING GIN (assigned_user_ids);

-- ─── Domain: task_assignments ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_assignments (
  id            SERIAL PRIMARY KEY,
  agency_id     UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  task_id       TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  agent_id      TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  role          TEXT,
  status        TEXT,
  handoff_notes TEXT,
  UNIQUE (task_id, agent_id, role)
);

-- ─── Domain: outputs ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS outputs (
  id               TEXT PRIMARY KEY,
  agency_id        UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  task_id          TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  client_id        TEXT REFERENCES clients(id) ON DELETE SET NULL,
  agent_id         TEXT REFERENCES agents(id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  deliverable_type TEXT,
  status           TEXT,
  owner_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
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
  assigned_user_ids UUID[] NOT NULL DEFAULT '{}',
  -- Opt-in public sharing: tokens are generated via POST /api/outputs/:id/share
  share_token      UUID,
  share_expires_at TIMESTAMPTZ,
  share_created_at TIMESTAMPTZ,
  share_created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_outputs_share_token
  ON outputs (share_token)
  WHERE share_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_outputs_assigned_user_ids ON outputs USING GIN (assigned_user_ids);

-- ─── Domain: conversations + messages ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id            TEXT PRIMARY KEY,
  agency_id     UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id     TEXT REFERENCES clients(id) ON DELETE SET NULL,
  task_id       TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  preview       TEXT,
  agent_id      TEXT REFERENCES agents(id) ON DELETE SET NULL,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,
  agent_id        TEXT REFERENCES agents(id) ON DELETE SET NULL,
  content         TEXT NOT NULL,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Domain: knowledge_assets ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS knowledge_assets (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id      UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id      TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  asset_type     TEXT,
  storage_bucket TEXT,
  storage_path   TEXT,
  public_url     TEXT,
  extracted_text TEXT,
  summary        TEXT,
  metadata       JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Domain: office_layouts (per-tenant office builder + credits) ───────────
CREATE TABLE IF NOT EXISTS office_layouts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id    UUID NOT NULL UNIQUE REFERENCES agencies(id) ON DELETE CASCADE,
  layout       JSONB NOT NULL DEFAULT '{"tiles": [], "zones": [], "version": 1, "gridWidth": 26, "gridHeight": 18, "floorAssetId": "floor-hardwood"}',
  mc_credits   INT NOT NULL DEFAULT 0,
  owned_assets TEXT[] NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Scheduled tasks ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  agent_id         TEXT REFERENCES agents(id) ON DELETE SET NULL,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name             TEXT NOT NULL,
  description      TEXT,
  task_type        TEXT NOT NULL DEFAULT 'custom',
  prompt           TEXT NOT NULL DEFAULT '',
  frequency        TEXT NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('once','daily','weekly','monthly')),
  day_of_week      INT,
  day_of_month     INT,
  time_hour        INT NOT NULL DEFAULT 9,
  time_minute      INT NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed','failed')),
  next_run_at      TIMESTAMPTZ,
  last_run_at      TIMESTAMPTZ,
  last_run_status  TEXT,
  last_run_output  TEXT,
  run_count        INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_tenant_id   ON scheduled_tasks (tenant_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next_run_at ON scheduled_tasks (next_run_at) WHERE status = 'active';

-- ─── Token usage ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS token_usage (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  agent_id      TEXT REFERENCES agents(id) ON DELETE SET NULL,
  source_type   TEXT NOT NULL DEFAULT 'chat',
  source_id     TEXT,
  provider      TEXT NOT NULL,
  model         TEXT NOT NULL,
  input_tokens  INT NOT NULL DEFAULT 0,
  output_tokens INT NOT NULL DEFAULT 0,
  total_tokens  INT NOT NULL DEFAULT 0,
  cost_usd      NUMERIC(12, 8) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_token_usage_tenant_id  ON token_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_agent_id   ON token_usage(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_token_usage_created_at ON token_usage(created_at DESC);

-- ─── Auth tokens (email verification, password reset, tenant invitations) ─
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  token        TEXT PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  consumed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_verification_user ON email_verification_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_unconsumed
  ON email_verification_tokens (expires_at) WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token        TEXT PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at   TIMESTAMPTZ NOT NULL,
  consumed_at  TIMESTAMPTZ,
  request_ip   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_unconsumed
  ON password_reset_tokens (expires_at) WHERE consumed_at IS NULL;

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
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_pending ON tenant_invitations (expires_at) WHERE consumed_at IS NULL;

-- ─── OAuth tokens (Google / Meta / future) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider                TEXT NOT NULL,
  account_email           TEXT,
  scope                   TEXT,
  access_token_encrypted  JSONB,
  refresh_token_encrypted JSONB,
  expires_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id  ON oauth_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_provider ON oauth_tokens (provider);

-- ─── Rate-limit buckets ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  bucket_key   TEXT PRIMARY KEY,
  count        INT  NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window_start ON rate_limit_buckets (window_start);

-- ─── Task events (SSE stream for async chat execution) ─────────────────────
CREATE TABLE IF NOT EXISTS task_events (
  id          BIGSERIAL PRIMARY KEY,
  task_id     TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  phase       TEXT,
  activity    TEXT,
  agent_id    TEXT,
  progress    INT,
  message     TEXT,
  payload     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_task_events_task_created ON task_events (task_id, id);
CREATE INDEX IF NOT EXISTS idx_task_events_tenant       ON task_events (tenant_id);

-- ─── Workflow instances + task runs (Batch T) ───────────────────────────────
-- These were missing from earlier init.sql versions even though the runner
-- code requires them. Without these, every async task crashed on first write.
CREATE TABLE IF NOT EXISTS workflow_instances (
  id              TEXT PRIMARY KEY,
  agency_id       UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  pipeline_id     TEXT,
  task_id         TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  status          TEXT NOT NULL,
  current_phase   TEXT,
  progress        NUMERIC DEFAULT 0,
  context         JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (agency_id, pipeline_id) REFERENCES pipelines(agency_id, id) ON DELETE SET NULL (pipeline_id)
);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_agency_id ON workflow_instances(agency_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_task_id   ON workflow_instances(task_id);

CREATE TABLE IF NOT EXISTS task_runs (
  id              BIGSERIAL PRIMARY KEY,
  agency_id       UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  task_id         TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  agent_id        TEXT REFERENCES agents(id) ON DELETE SET NULL,
  stage           TEXT NOT NULL,
  status          TEXT NOT NULL,
  input_payload   JSONB DEFAULT '{}'::jsonb,
  output_payload  JSONB DEFAULT '{}'::jsonb,
  error_message   TEXT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_task_runs_agency_id    ON task_runs(agency_id);
CREATE INDEX IF NOT EXISTS idx_task_runs_task_id      ON task_runs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_runs_task_created ON task_runs(task_id, created_at DESC);

-- Durable execution queue. Jobs survive app restarts and are reclaimed by
-- the queue worker when the application boots or receives a new enqueue.
CREATE TABLE IF NOT EXISTS execution_jobs (
  task_id          TEXT PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE,
  agency_id        UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  started_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  action           TEXT NOT NULL DEFAULT 'retry',
  status           TEXT NOT NULL DEFAULT 'queued',
  options          JSONB NOT NULL DEFAULT '{}'::jsonb,
  attempts         INT NOT NULL DEFAULT 0,
  queued_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  heartbeat_at     TIMESTAMPTZ,
  error            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_execution_jobs_status_queued ON execution_jobs(status, queued_at);

-- ─── Audit log ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID REFERENCES agencies(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,
  entity_type  TEXT,
  entity_id    TEXT,
  before_state JSONB,
  after_state  JSONB,
  ip_address   TEXT,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_tenant_id ON audit_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor     ON audit_events(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created   ON audit_events(created_at DESC);

-- ─── Tenant-scoped indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_agents_agency_id        ON agents        (agency_id);
CREATE INDEX IF NOT EXISTS idx_clients_agency_id       ON clients       (agency_id);
CREATE INDEX IF NOT EXISTS idx_skills_agency_id        ON skills        (agency_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_agency_id     ON pipelines     (agency_id);
CREATE INDEX IF NOT EXISTS idx_tasks_agency_id         ON tasks         (agency_id);
CREATE INDEX IF NOT EXISTS idx_outputs_agency_id       ON outputs       (agency_id);
CREATE INDEX IF NOT EXISTS idx_conversations_agency_id ON conversations (agency_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_agency_id     ON knowledge_assets (agency_id);

-- ─── updated_at triggers ───────────────────────────────────────────────────
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','profiles','agencies','subscriptions',
    'agents','clients','skills','pipelines',
    'tasks','outputs','conversations','knowledge_assets',
    'office_layouts','scheduled_tasks','mission_control_state','oauth_tokens',
    'workflow_instances','task_runs'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_set_updated_at ON %I', t, t);
    EXECUTE format(
      'CREATE TRIGGER %I_set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp()',
      t, t
    );
  END LOOP;
END$$;
