-- Tenant-safe skill/pipeline catalogs and durable task execution queue.
-- Existing logical ids are preserved. The owning agency becomes part of each
-- catalog key so every tenant can safely own `seo-audit`, `media-plan`, etc.

BEGIN;

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_pipeline_id_fkey;
ALTER TABLE workflow_instances DROP CONSTRAINT IF EXISTS workflow_instances_pipeline_id_fkey;

ALTER TABLE pipelines DROP CONSTRAINT IF EXISTS pipelines_pkey;
ALTER TABLE pipelines ADD CONSTRAINT pipelines_pkey PRIMARY KEY (agency_id, id);

ALTER TABLE skills DROP CONSTRAINT IF EXISTS skills_pkey;
ALTER TABLE skills ADD CONSTRAINT skills_pkey PRIMARY KEY (agency_id, id);

ALTER TABLE tasks
  ADD CONSTRAINT tasks_pipeline_id_fkey
  FOREIGN KEY (agency_id, pipeline_id)
  REFERENCES pipelines(agency_id, id)
  ON DELETE SET NULL (pipeline_id);

ALTER TABLE workflow_instances
  ADD CONSTRAINT workflow_instances_pipeline_id_fkey
  FOREIGN KEY (agency_id, pipeline_id)
  REFERENCES pipelines(agency_id, id)
  ON DELETE SET NULL (pipeline_id);

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

CREATE INDEX IF NOT EXISTS idx_execution_jobs_status_queued
  ON execution_jobs(status, queued_at);

COMMIT;
