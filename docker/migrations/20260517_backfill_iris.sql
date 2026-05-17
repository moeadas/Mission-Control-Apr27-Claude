-- Batch D — backfill Iris for tenants that pre-date the auto-seed change.
-- Idempotent: ON CONFLICT(id) DO NOTHING. Safe to re-run.
--
-- After this runs, /api/agent-templates/clone is the canonical way for any
-- tenant to add Iris (or any other template). The application also auto-seeds
-- Iris into every newly-created tenant via createTenant().
--
-- Apply with:
--   docker compose exec -T db psql -U mc_user -d mission_control \
--     < docker/migrations/20260517_backfill_iris.sql

BEGIN;

-- Use INSERT … SELECT to copy the Iris definition into every existing tenant
-- that doesn't already have it. The Iris definition is intentionally kept
-- minimal here — full system prompt + skill list + tool list come from the
-- application layer via cloneAgentTemplates() once the tenant first calls it.
-- This SQL guarantees only that the Iris row EXISTS so chat/routing works.

INSERT INTO agents (
  id, agency_id, name, role, division, specialty, status,
  bio, system_prompt, provider, model, temperature, max_tokens,
  color, accent_color, avatar, tools, skills, metadata
)
SELECT
  'iris'::text,
  a.id,
  'Iris'::text,
  'Operations Lead'::text,
  'orchestration'::text,
  'orchestration'::text,
  'idle'::text,
  'Iris is the central orchestrator — classifies requests, routes to the right specialist, and keeps quality high.',
  'You are Iris, the operations lead for this company. You classify user requests, route work to specialist agents, and produce the final deliverable when no specialist is required. Be concise, decisive, and brand-aware.',
  'ollama'::text,
  'minimax-m2.7:cloud'::text,
  0.4,
  4096,
  '#a78bfa'::text,
  'purple'::text,
  'bot-purple'::text,
  '["web-search","analytics","document","spreadsheet","presentation"]'::jsonb,
  '["operations-management","workflow-design","cross-functional-coordination","task-triaging","priority-management","stakeholder-communication","status-reporting","bottleneck-identification","resource-optimization","documentation"]'::jsonb,
  jsonb_build_object(
    'templateId', 'iris',
    'clonedFrom', 'backfill-migration',
    'clonedAt', now()
  )
FROM agencies a
WHERE NOT EXISTS (
  SELECT 1 FROM agents WHERE agency_id = a.id AND id = 'iris'
)
ON CONFLICT (id) DO NOTHING;

-- Refresh subscription.current_agent_count for any tenants we touched.
UPDATE subscriptions s
SET current_agent_count = (
  SELECT COUNT(*)::int FROM agents WHERE agency_id = s.tenant_id
),
updated_at = now();

COMMIT;
