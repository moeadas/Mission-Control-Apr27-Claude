-- Batch T: create workflow_instances + task_runs tables
--
-- These tables are referenced by src/lib/server/task-execution.ts but were
-- missing from init.sql AND from every migration. As a result, every async
-- task execution crashed on the first INSERT INTO workflow_instances,
-- leaving tasks stuck at the client's hardcoded 8% provisional progress.
--
-- Verified empirically: production logs showed `relation "workflow_instances"
-- does not exist` errors from runTaskExecution.

CREATE TABLE IF NOT EXISTS workflow_instances (
  id              text PRIMARY KEY,
  agency_id       uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  pipeline_id     text REFERENCES pipelines(id) ON DELETE SET NULL,
  task_id         text NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  status          text NOT NULL,
  current_phase   text,
  progress        numeric DEFAULT 0,
  context         jsonb DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_instances_agency_id ON workflow_instances(agency_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_task_id   ON workflow_instances(task_id);

DROP TRIGGER IF EXISTS workflow_instances_set_updated_at ON workflow_instances;
CREATE TRIGGER workflow_instances_set_updated_at
  BEFORE UPDATE ON workflow_instances
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();


CREATE TABLE IF NOT EXISTS task_runs (
  id              bigserial PRIMARY KEY,
  agency_id       uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  task_id         text NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  agent_id        text REFERENCES agents(id) ON DELETE SET NULL,
  stage           text NOT NULL,
  status          text NOT NULL,
  input_payload   jsonb DEFAULT '{}'::jsonb,
  output_payload  jsonb DEFAULT '{}'::jsonb,
  error_message   text,
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_runs_agency_id ON task_runs(agency_id);
CREATE INDEX IF NOT EXISTS idx_task_runs_task_id   ON task_runs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_runs_task_created ON task_runs(task_id, created_at DESC);

DROP TRIGGER IF EXISTS task_runs_set_updated_at ON task_runs;
CREATE TRIGGER task_runs_set_updated_at
  BEFORE UPDATE ON task_runs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();
