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

CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'member',
  is_active  BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Core state blob ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mission_control_state (
  agency_id  TEXT PRIMARY KEY,
  state      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Relational tables ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agencies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  settings   JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
