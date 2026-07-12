-- Normalize structured JSONB values written as quoted JSON by legacy state syncs.
-- Safe to run repeatedly: already-structured arrays/objects are unchanged.

CREATE OR REPLACE FUNCTION pg_temp.unwrap_structured_jsonb(value jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  current_value jsonb := value;
  decoded jsonb;
  attempts integer := 0;
BEGIN
  WHILE current_value IS NOT NULL AND jsonb_typeof(current_value) = 'string' AND attempts < 3 LOOP
    BEGIN
      decoded := (current_value #>> '{}')::jsonb;
    EXCEPTION WHEN others THEN
      RETURN current_value;
    END;
    current_value := decoded;
    attempts := attempts + 1;
  END LOOP;
  RETURN current_value;
END;
$$;

UPDATE agents SET
  position = pg_temp.unwrap_structured_jsonb(position),
  tools = pg_temp.unwrap_structured_jsonb(tools),
  skills = pg_temp.unwrap_structured_jsonb(skills),
  responsibilities = pg_temp.unwrap_structured_jsonb(responsibilities),
  primary_outputs = pg_temp.unwrap_structured_jsonb(primary_outputs),
  metadata = pg_temp.unwrap_structured_jsonb(metadata)
WHERE jsonb_typeof(position) = 'string'
   OR jsonb_typeof(tools) = 'string'
   OR jsonb_typeof(skills) = 'string'
   OR jsonb_typeof(responsibilities) = 'string'
   OR jsonb_typeof(primary_outputs) = 'string'
   OR jsonb_typeof(metadata) = 'string';

UPDATE tasks SET
  execution_plan = pg_temp.unwrap_structured_jsonb(execution_plan),
  metadata = pg_temp.unwrap_structured_jsonb(metadata)
WHERE jsonb_typeof(execution_plan) = 'string'
   OR jsonb_typeof(metadata) = 'string';

UPDATE outputs SET
  creative = pg_temp.unwrap_structured_jsonb(creative),
  exports = pg_temp.unwrap_structured_jsonb(exports),
  execution_steps = pg_temp.unwrap_structured_jsonb(execution_steps),
  metadata = pg_temp.unwrap_structured_jsonb(metadata)
WHERE jsonb_typeof(creative) = 'string'
   OR jsonb_typeof(exports) = 'string'
   OR jsonb_typeof(execution_steps) = 'string'
   OR jsonb_typeof(metadata) = 'string';

UPDATE clients SET
  brief = pg_temp.unwrap_structured_jsonb(brief),
  metadata = pg_temp.unwrap_structured_jsonb(metadata)
WHERE jsonb_typeof(brief) = 'string'
   OR jsonb_typeof(metadata) = 'string';

UPDATE conversations SET metadata = pg_temp.unwrap_structured_jsonb(metadata)
WHERE jsonb_typeof(metadata) = 'string';

UPDATE messages SET
  attachments = pg_temp.unwrap_structured_jsonb(attachments),
  metadata = pg_temp.unwrap_structured_jsonb(metadata)
WHERE jsonb_typeof(attachments) = 'string'
   OR jsonb_typeof(metadata) = 'string';

-- A completed workflow is authoritative. Repair task rows that an older
-- browser snapshot downgraded after server-side completion.
UPDATE tasks AS task
SET progress = 100,
    completed_at = COALESCE(task.completed_at, workflow.updated_at),
    updated_at = GREATEST(task.updated_at, workflow.updated_at)
FROM workflow_instances AS workflow
WHERE workflow.agency_id = task.agency_id
  AND workflow.task_id = task.id
  AND workflow.status = 'completed'
  AND workflow.progress = 100
  AND task.status IN ('completed', 'completed_with_warnings')
  AND task.progress < 100;
