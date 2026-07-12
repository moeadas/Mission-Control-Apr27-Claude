-- Normalize JSONB values that legacy relational snapshot upserts stored as
-- JSON strings. New writes explicitly cast structured parameters to JSONB.

CREATE OR REPLACE FUNCTION pg_temp.unwrap_jsonb(value jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  IF value IS NULL OR jsonb_typeof(value) <> 'string' THEN
    RETURN value;
  END IF;
  RETURN (value #>> '{}')::jsonb;
EXCEPTION WHEN others THEN
  RETURN value;
END;
$$;

UPDATE agents SET
  position = pg_temp.unwrap_jsonb(position),
  tools = pg_temp.unwrap_jsonb(tools),
  skills = pg_temp.unwrap_jsonb(skills),
  responsibilities = pg_temp.unwrap_jsonb(responsibilities),
  primary_outputs = pg_temp.unwrap_jsonb(primary_outputs),
  metadata = pg_temp.unwrap_jsonb(metadata);

UPDATE clients SET
  brief = pg_temp.unwrap_jsonb(brief),
  metadata = pg_temp.unwrap_jsonb(metadata);

UPDATE tasks SET
  execution_plan = pg_temp.unwrap_jsonb(execution_plan),
  metadata = pg_temp.unwrap_jsonb(metadata);

UPDATE outputs SET
  creative = pg_temp.unwrap_jsonb(creative),
  exports = pg_temp.unwrap_jsonb(exports),
  metadata = pg_temp.unwrap_jsonb(metadata),
  execution_steps = pg_temp.unwrap_jsonb(execution_steps);

UPDATE conversations SET metadata = pg_temp.unwrap_jsonb(metadata);

UPDATE skills SET
  prompts = pg_temp.unwrap_jsonb(prompts),
  checklist = pg_temp.unwrap_jsonb(checklist),
  examples = pg_temp.unwrap_jsonb(examples),
  metadata = pg_temp.unwrap_jsonb(metadata);

UPDATE pipelines SET definition = pg_temp.unwrap_jsonb(definition);
