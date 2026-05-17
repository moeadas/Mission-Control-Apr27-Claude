-- Schema-integrity migration (Batch B)
-- Brings the existing prod DB in line with the rewritten init.sql.
--
-- Apply on the VPS:
--   docker compose exec -T db psql -U mc_user -d mission_control \
--     < docker/migrations/20260516_schema_integrity.sql
--
-- Safe to re-run: every operation is idempotent via IF NOT EXISTS / IF EXISTS / ON CONFLICT.

BEGIN;

-- ─── Trigger function ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── users: email_verified_at column + lower-email index ───────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));

-- ─── outputs: share-token columns + index (idempotent — overlap with 20260515) ─
ALTER TABLE outputs
  ADD COLUMN IF NOT EXISTS share_token        UUID,
  ADD COLUMN IF NOT EXISTS share_expires_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS share_created_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS share_created_by   UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_outputs_share_token
  ON outputs (share_token)
  WHERE share_token IS NOT NULL;

-- ─── created_at / updated_at defaults — add where missing ──────────────────
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tasks','outputs','clients','conversations','agents','skills','pipelines'
  ]
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I ALTER COLUMN created_at SET DEFAULT now()', t);
    EXCEPTION WHEN OTHERS THEN
      -- Column may already have the default; ignore.
      NULL;
    END;
    BEGIN
      EXECUTE format('ALTER TABLE %I ALTER COLUMN updated_at SET DEFAULT now()', t);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END$$;

-- ─── agents: add missing created_at/updated_at columns ─────────────────────
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ─── tasks: FK constraints where missing ───────────────────────────────────
-- Add ON DELETE actions to tasks.client_id (was no-action)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_client_id_fkey'
  ) THEN
    ALTER TABLE tasks DROP CONSTRAINT tasks_client_id_fkey;
  END IF;
END$$;
ALTER TABLE tasks
  ADD CONSTRAINT tasks_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

-- tasks.lead_agent_id → agents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_lead_agent_id_fkey'
  ) THEN
    -- Null out any orphaned references first so the constraint can be added cleanly.
    UPDATE tasks SET lead_agent_id = NULL
    WHERE lead_agent_id IS NOT NULL
      AND lead_agent_id NOT IN (SELECT id FROM agents);
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_lead_agent_id_fkey
      FOREIGN KEY (lead_agent_id) REFERENCES agents(id) ON DELETE SET NULL;
  END IF;
END$$;

-- tasks.pipeline_id → pipelines
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_pipeline_id_fkey'
  ) THEN
    UPDATE tasks SET pipeline_id = NULL
    WHERE pipeline_id IS NOT NULL
      AND pipeline_id NOT IN (SELECT id FROM pipelines);
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_pipeline_id_fkey
      FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE SET NULL;
  END IF;
END$$;

-- ─── outputs: FK constraints where missing ─────────────────────────────────
-- outputs.task_id (set to CASCADE so when a task is deleted its outputs go too)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'outputs_task_id_fkey'
  ) THEN
    ALTER TABLE outputs DROP CONSTRAINT outputs_task_id_fkey;
  END IF;
END$$;
ALTER TABLE outputs
  ADD CONSTRAINT outputs_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

-- outputs.client_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'outputs_client_id_fkey'
  ) THEN
    ALTER TABLE outputs DROP CONSTRAINT outputs_client_id_fkey;
  END IF;
END$$;
ALTER TABLE outputs
  ADD CONSTRAINT outputs_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

-- outputs.agent_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'outputs_agent_id_fkey'
  ) THEN
    UPDATE outputs SET agent_id = NULL
    WHERE agent_id IS NOT NULL
      AND agent_id NOT IN (SELECT id FROM agents);
    ALTER TABLE outputs
      ADD CONSTRAINT outputs_agent_id_fkey
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL;
  END IF;
END$$;

-- outputs.owner_user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'outputs_owner_user_id_fkey'
  ) THEN
    UPDATE outputs SET owner_user_id = NULL
    WHERE owner_user_id IS NOT NULL
      AND owner_user_id NOT IN (SELECT id FROM users);
    ALTER TABLE outputs
      ADD CONSTRAINT outputs_owner_user_id_fkey
      FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END$$;

-- ─── task_assignments: FK on agent_id, uniqueness ──────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'task_assignments_agent_id_fkey'
  ) THEN
    DELETE FROM task_assignments
    WHERE agent_id NOT IN (SELECT id FROM agents);
    ALTER TABLE task_assignments
      ADD CONSTRAINT task_assignments_agent_id_fkey
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'task_assignments_agency_id_fkey'
  ) THEN
    ALTER TABLE task_assignments
      ADD CONSTRAINT task_assignments_agency_id_fkey
      FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE;
  END IF;
END$$;

-- ─── conversations: client_id, task_id ON DELETE clauses ───────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversations_client_id_fkey'
  ) THEN
    ALTER TABLE conversations DROP CONSTRAINT conversations_client_id_fkey;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversations_task_id_fkey'
  ) THEN
    ALTER TABLE conversations DROP CONSTRAINT conversations_task_id_fkey;
  END IF;
END$$;
ALTER TABLE conversations
  ADD CONSTRAINT conversations_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  ADD CONSTRAINT conversations_task_id_fkey   FOREIGN KEY (task_id)   REFERENCES tasks(id)   ON DELETE SET NULL;

-- ─── scheduled_tasks: created_by_user_id + status/frequency CHECKs ─────────
ALTER TABLE scheduled_tasks
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

DO $$
BEGIN
  -- Add CHECK constraints if not present
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'scheduled_tasks'::regclass AND conname = 'scheduled_tasks_frequency_check'
  ) THEN
    -- Coerce any legacy values to 'weekly' before constraining
    UPDATE scheduled_tasks SET frequency = 'weekly'
    WHERE frequency NOT IN ('once','daily','weekly','monthly');
    ALTER TABLE scheduled_tasks
      ADD CONSTRAINT scheduled_tasks_frequency_check
      CHECK (frequency IN ('once','daily','weekly','monthly'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'scheduled_tasks'::regclass AND conname = 'scheduled_tasks_status_check'
  ) THEN
    UPDATE scheduled_tasks SET status = 'active'
    WHERE status NOT IN ('active','paused','completed','failed');
    ALTER TABLE scheduled_tasks
      ADD CONSTRAINT scheduled_tasks_status_check
      CHECK (status IN ('active','paused','completed','failed'));
  END IF;
END$$;

-- ─── office_layouts: ensure table exists (was missing from init.sql) ───────
CREATE TABLE IF NOT EXISTS office_layouts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id    UUID NOT NULL UNIQUE REFERENCES agencies(id) ON DELETE CASCADE,
  layout       JSONB NOT NULL DEFAULT '{"tiles": [], "zones": [], "version": 1, "gridWidth": 26, "gridHeight": 18, "floorAssetId": "floor-hardwood"}',
  mc_credits   INT NOT NULL DEFAULT 0,
  owned_assets TEXT[] NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── audit_events table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES agencies(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  entity_type   TEXT,
  entity_id     TEXT,
  before_state  JSONB,
  after_state   JSONB,
  ip_address    TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_tenant_id ON audit_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor     ON audit_events(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created   ON audit_events(created_at DESC);

-- ─── updated_at triggers on every table that has the column ────────────────
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','profiles','agencies','subscriptions',
    'agents','clients','skills','pipelines',
    'tasks','outputs','conversations','knowledge_assets',
    'office_layouts','scheduled_tasks','mission_control_state'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_set_updated_at ON %I', t, t);
    EXECUTE format(
      'CREATE TRIGGER %I_set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp()',
      t, t
    );
  END LOOP;
END$$;

COMMIT;
