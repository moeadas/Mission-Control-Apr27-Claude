-- Batch M — task_events table for SSE streaming of background chat execution.
--
-- The /api/chat route now returns immediately with a task id, and the
-- autonomous-task runner writes progress events here as it works. Both
-- IrisChat and the Live Task Tracker on /tasks/[id] subscribe to an SSE
-- endpoint that tails this table for new rows.
--
-- Apply on the VPS:
--   docker compose exec -T db psql -U mc_user -d mission_control \
--     < docker/migrations/20260517_task_events.sql

BEGIN;

CREATE TABLE IF NOT EXISTS task_events (
  id          BIGSERIAL PRIMARY KEY,
  task_id     TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,            -- queued|running|phase_start|activity_start|activity_complete|progress|done|error
  phase       TEXT,                     -- pipeline phase name (when applicable)
  activity    TEXT,                     -- activity name (when applicable)
  agent_id    TEXT,                     -- agent id (when applicable)
  progress    INT,                      -- 0..100
  message     TEXT,                     -- free-form human-readable status
  payload     JSONB,                    -- structured extras (output preview, error code, etc.)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_events_task_created ON task_events (task_id, id);
CREATE INDEX IF NOT EXISTS idx_task_events_tenant       ON task_events (tenant_id);

COMMIT;
