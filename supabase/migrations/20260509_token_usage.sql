-- Token usage tracking table
-- Logs every AI call with token counts and estimated cost
-- Scoped to tenant; agent_id, source_type, and source_id allow grouping by agent and task

CREATE TABLE IF NOT EXISTS token_usage (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  agent_id     TEXT,
  source_type  TEXT NOT NULL DEFAULT 'chat',   -- 'chat' | 'scheduled' | 'manual' | 'pipeline'
  source_id    TEXT,                            -- task id, scheduled_task id, etc.
  provider     TEXT NOT NULL,
  model        TEXT NOT NULL,
  input_tokens  INT NOT NULL DEFAULT 0,
  output_tokens INT NOT NULL DEFAULT 0,
  total_tokens  INT NOT NULL DEFAULT 0,
  cost_usd     NUMERIC(12, 8) NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_token_usage_tenant_id   ON token_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_agent_id    ON token_usage(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_token_usage_created_at  ON token_usage(created_at DESC);
