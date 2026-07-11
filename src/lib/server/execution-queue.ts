import type { AuthContext } from '@/lib/auth/server'
import { getDb } from '@/lib/db/client'
import { loadPersistedProviderSettings } from '@/lib/server/provider-secrets'
import { runTaskExecution, type TaskBootstrap } from '@/lib/server/task-execution'

type QueueStatus = 'queued' | 'running' | 'completed' | 'failed'

export interface QueueJobState {
  taskId: string
  action: 'retry' | 'resume'
  status: QueueStatus
  startedBy: string | null
  queuedAt: string
  startedAt?: string
  completedAt?: string
  error?: string
  attempts: number
}

interface QueueOptions {
  comment?: string
  runtimeMode?: 'fast' | 'thinking' | 'compare'
  bootstrap?: TaskBootstrap
}

let workerPromise: Promise<void> | null = null

function mapJob(row: any): QueueJobState {
  return {
    taskId: row.task_id,
    action: row.action === 'resume' ? 'resume' : 'retry',
    status: row.status,
    startedBy: row.started_by || null,
    queuedAt: new Date(row.queued_at).toISOString(),
    startedAt: row.started_at ? new Date(row.started_at).toISOString() : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : undefined,
    error: row.error || undefined,
    attempts: Number(row.attempts || 0),
  }
}

export async function getExecutionJobState(taskId: string) {
  const db = getDb()
  const rows = await db`SELECT * FROM execution_jobs WHERE task_id = ${taskId} LIMIT 1`
  return rows[0] ? mapJob(rows[0]) : null
}

async function claimNextJob() {
  const db = getDb()
  const rows = await db.begin(async (tx) => {
    const candidates = await tx`
      SELECT task_id
      FROM execution_jobs
      WHERE status = 'queued'
      ORDER BY queued_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `
    if (!candidates[0]) return []
    return tx`
      UPDATE execution_jobs
      SET status = 'running',
          started_at = now(),
          heartbeat_at = now(),
          completed_at = NULL,
          error = NULL,
          attempts = attempts + 1,
          updated_at = now()
      WHERE task_id = ${candidates[0].task_id}
      RETURNING *
    `
  })
  return (rows[0] as any) || null
}

async function loadJobAuth(row: any): Promise<AuthContext> {
  const db = getDb()
  const users = await db`
    SELECT id, email, role
    FROM users
    WHERE id = ${row.started_by}::uuid
    LIMIT 1
  `
  const user = users[0]
  if (!user) throw new Error('The user who queued this task no longer exists.')
  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    tenantId: row.agency_id,
    providerSettings: (await loadPersistedProviderSettings(user.id)) || ({} as AuthContext['providerSettings']),
  }
}

async function processQueue() {
  const db = getDb()
  while (true) {
    const row = await claimNextJob()
    if (!row) return
    const heartbeat = setInterval(() => {
      void db`
        UPDATE execution_jobs
        SET heartbeat_at = now(), updated_at = now()
        WHERE task_id = ${row.task_id} AND status = 'running'
      `.catch((error) => console.warn('[execution-queue] heartbeat failed', error))
    }, 30_000)
    try {
      const auth = await loadJobAuth(row)
      const options = (row.options || {}) as QueueOptions
      await runTaskExecution(row.task_id, auth, row.action === 'resume' ? 'resume' : 'retry', options)
      await db`
        UPDATE execution_jobs
        SET status = 'completed', completed_at = now(), heartbeat_at = now(), updated_at = now()
        WHERE task_id = ${row.task_id}
      `
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Task execution failed.'
      await db`
        UPDATE execution_jobs
        SET status = 'failed',
            completed_at = now(),
            heartbeat_at = now(),
            error = ${message},
            updated_at = now()
        WHERE task_id = ${row.task_id}
      `
      await db`
        UPDATE tasks
        SET status = 'failed', metadata = COALESCE(metadata, '{}'::jsonb) || ${db.json({ queueError: message })}::jsonb,
            updated_at = now()
        WHERE id = ${row.task_id} AND agency_id = ${row.agency_id}::uuid
      `
    } finally {
      clearInterval(heartbeat)
    }
  }
}

function kickWorker() {
  if (workerPromise) return
  workerPromise = processQueue()
    .catch((error) => console.error('[execution-queue] worker failed', error))
    .finally(() => {
      workerPromise = null
    })
}

export async function recoverExecutionJobs() {
  try {
    const db = getDb()
    await db`
      UPDATE execution_jobs
      SET status = 'queued', started_at = NULL, heartbeat_at = NULL, updated_at = now()
      WHERE status = 'running'
        AND COALESCE(heartbeat_at, started_at, queued_at) < now() - interval '10 minutes'
    `
    kickWorker()
  } catch (error) {
    console.warn('[execution-queue] recovery deferred:', error)
  }
}

export async function queueTaskExecution(
  taskId: string,
  auth: AuthContext,
  action: 'retry' | 'resume' = 'retry',
  options?: QueueOptions
) {
  if (!auth.tenantId) throw new Error('Task execution requires a tenant.')
  const db = getDb()
  const tasks = await db`
    SELECT id FROM tasks
    WHERE id = ${taskId} AND agency_id = ${auth.tenantId}::uuid
    LIMIT 1
  `
  if (!tasks[0]) throw new Error('Task not found.')
  const rows = await db`
    INSERT INTO execution_jobs (
      task_id, agency_id, started_by, action, status, options, attempts, queued_at
    ) VALUES (
      ${taskId}, ${auth.tenantId}::uuid, ${auth.userId}::uuid, ${action},
      'queued', ${db.json((options || {}) as any)}, 0, now()
    )
    ON CONFLICT (task_id) DO UPDATE SET
      agency_id = EXCLUDED.agency_id,
      started_by = EXCLUDED.started_by,
      action = EXCLUDED.action,
      status = CASE
        WHEN execution_jobs.status IN ('queued', 'running') THEN execution_jobs.status
        ELSE 'queued'
      END,
      options = EXCLUDED.options,
      queued_at = CASE
        WHEN execution_jobs.status IN ('queued', 'running') THEN execution_jobs.queued_at
        ELSE now()
      END,
      started_at = CASE WHEN execution_jobs.status IN ('queued', 'running') THEN execution_jobs.started_at ELSE NULL END,
      completed_at = CASE WHEN execution_jobs.status IN ('queued', 'running') THEN execution_jobs.completed_at ELSE NULL END,
      error = CASE WHEN execution_jobs.status IN ('queued', 'running') THEN execution_jobs.error ELSE NULL END,
      updated_at = now()
    RETURNING *
  `
  kickWorker()
  return mapJob(rows[0])
}
