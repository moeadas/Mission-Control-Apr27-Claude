-- Keep task, workflow, and root-run completion state aligned even when an
-- older browser snapshot or a delayed state sync writes after the runner.

CREATE OR REPLACE FUNCTION enforce_completed_task_progress()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IN ('completed', 'completed_with_warnings') THEN
    NEW.progress := 100;
    NEW.completed_at := COALESCE(NEW.completed_at, NOW());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tasks_completed_progress_guard ON tasks;
CREATE TRIGGER tasks_completed_progress_guard
BEFORE INSERT OR UPDATE OF status, progress, completed_at ON tasks
FOR EACH ROW
EXECUTE FUNCTION enforce_completed_task_progress();

UPDATE tasks
SET progress = 100,
    completed_at = COALESCE(completed_at, updated_at, NOW())
WHERE status IN ('completed', 'completed_with_warnings')
  AND (progress <> 100 OR completed_at IS NULL);

UPDATE task_runs AS root_run
SET status = 'completed',
    completed_at = COALESCE(root_run.completed_at, task.completed_at, NOW())
FROM tasks AS task
WHERE root_run.agency_id = task.agency_id
  AND root_run.task_id = task.id
  AND root_run.stage = 'task-execution'
  AND root_run.status = 'in_progress'
  AND task.status IN ('completed', 'completed_with_warnings');
