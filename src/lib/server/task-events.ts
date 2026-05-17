/**
 * Task event emitter (Batch M)
 *
 * Writes progress markers to the `task_events` table during background
 * autonomous-task execution. The chat SSE endpoint
 * (`/api/chat/stream/[taskId]`) tails this table and pushes each new event
 * to subscribed clients (IrisChat, the Live Task Tracker on /tasks/[id]).
 *
 * Designed to be call-it-and-forget — every emit is wrapped in try/catch so
 * a DB hiccup during a long run never derails the actual generation.
 */
import { getDb } from '@/lib/db/client'

export type TaskEventType =
  | 'queued'
  | 'running'
  | 'phase_start'
  | 'activity_start'
  | 'activity_complete'
  | 'progress'
  | 'done'
  | 'error'

export interface TaskEventInput {
  taskId: string
  tenantId: string
  type: TaskEventType
  phase?: string | null
  activity?: string | null
  agentId?: string | null
  progress?: number | null
  message?: string | null
  payload?: any
}

export interface TaskEventRow {
  id: number
  task_id: string
  tenant_id: string
  event_type: TaskEventType
  phase: string | null
  activity: string | null
  agent_id: string | null
  progress: number | null
  message: string | null
  payload: any
  created_at: string
}

export async function emitTaskEvent(input: TaskEventInput): Promise<void> {
  try {
    const db = getDb()
    await db`
      INSERT INTO task_events (task_id, tenant_id, event_type, phase, activity, agent_id, progress, message, payload)
      VALUES (
        ${input.taskId},
        ${input.tenantId}::uuid,
        ${input.type},
        ${input.phase ?? null},
        ${input.activity ?? null},
        ${input.agentId ?? null},
        ${typeof input.progress === 'number' ? Math.max(0, Math.min(100, Math.round(input.progress))) : null},
        ${input.message ?? null},
        ${input.payload ? JSON.stringify(input.payload) : null}::jsonb
      )
    `
  } catch (err) {
    // Never crash the runner over telemetry.
    console.warn('[task-events] emit failed', err)
  }
}

/**
 * Fetch all events for a task that occurred after a given event id. Used by
 * the SSE route to ship deltas to subscribed clients.
 */
export async function listTaskEventsSince(taskId: string, afterId: number): Promise<TaskEventRow[]> {
  const db = getDb()
  const rows = await db`
    SELECT id, task_id, tenant_id, event_type, phase, activity, agent_id, progress, message, payload, created_at
    FROM task_events
    WHERE task_id = ${taskId}
      AND id > ${afterId}
    ORDER BY id ASC
    LIMIT 200
  `
  return rows as unknown as TaskEventRow[]
}

/**
 * Check whether a task is in a terminal state (done/error). Used by the SSE
 * route to know when to stop polling and close the stream.
 */
export async function isTaskTerminal(taskId: string): Promise<boolean> {
  const db = getDb()
  const rows = await db`
    SELECT 1 FROM task_events
    WHERE task_id = ${taskId} AND event_type IN ('done', 'error')
    LIMIT 1
  `
  return rows.length > 0
}

/**
 * Return the latest snapshot for a task: status + most-recent progress +
 * latest phase/activity/agent + final payload (if done). Used by the
 * /tasks/[id] page on first paint before the SSE stream wakes up.
 */
export async function getTaskEventSnapshot(taskId: string) {
  const db = getDb()
  const rows = await db`
    SELECT event_type, phase, activity, agent_id, progress, message, payload, created_at
    FROM task_events
    WHERE task_id = ${taskId}
    ORDER BY id DESC
    LIMIT 50
  `
  return rows
}
