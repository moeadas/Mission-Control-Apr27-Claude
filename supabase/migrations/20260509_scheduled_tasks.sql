-- ─── Scheduled Tasks ───────────────────────────────────────────────────────────
-- Stores recurring automation tasks that agents execute on a schedule.
-- Tenant-scoped via tenant_id (agencies.id).

CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  agent_id         TEXT,
  name             TEXT NOT NULL,
  description      TEXT,
  task_type        TEXT NOT NULL DEFAULT 'custom',
  prompt           TEXT NOT NULL DEFAULT '',
  frequency        TEXT NOT NULL DEFAULT 'weekly',
  day_of_week      INT,
  day_of_month     INT,
  time_hour        INT NOT NULL DEFAULT 9,
  time_minute      INT NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'active',
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
