-- Resource-level access control (Batch C)
-- Tenant members see ALL their tenant's resources by default. Tenant admins
-- can restrict a resource to specific members by setting assigned_user_ids;
-- an empty array means "shared with the whole tenant".
--
-- Apply on the VPS:
--   docker compose exec -T db psql -U mc_user -d mission_control \
--     < docker/migrations/20260516_resource_acl.sql

BEGIN;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS assigned_user_ids UUID[] NOT NULL DEFAULT '{}';

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS assigned_user_ids UUID[] NOT NULL DEFAULT '{}';

ALTER TABLE outputs
  ADD COLUMN IF NOT EXISTS assigned_user_ids UUID[] NOT NULL DEFAULT '{}';

-- GIN indexes so "current user in assigned_user_ids" lookups are fast.
CREATE INDEX IF NOT EXISTS idx_clients_assigned_user_ids ON clients USING GIN (assigned_user_ids);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_user_ids   ON tasks   USING GIN (assigned_user_ids);
CREATE INDEX IF NOT EXISTS idx_outputs_assigned_user_ids ON outputs USING GIN (assigned_user_ids);

COMMIT;
