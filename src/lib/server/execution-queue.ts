import type { AuthContext } from '@/lib/auth/server'
import { runTaskExecution } from '@/lib/server/task-execution'

type QueueStatus = 'idle' | 'queued' | 'running' | 'completed' | 'failed'

interface QueueJobState {
  taskId: string
  action: 'retry' | 'resume'
  status: QueueStatus
  startedBy: string
  queuedAt: string
  startedAt?: string
  completedAt?: string
  error?: string
}

const jobs = new Map<string, QueueJobState>()

export function getExecutionJobState(taskId: string) {
  return jobs.get(taskId) || null
}

export function queueTaskExecution(
  taskId: string,
  auth: AuthContext,
  action: 'retry' | 'resume' = 'retry',
  options?: { comment?: string; runtimeMode?: 'fast' | 'thinking' | 'compare' }
) {
  const existing = jobs.get(taskId)
  if (existing && (existing.status === 'queued' || existing.status === 'running')) {
    return existing
  }

  const job: QueueJobState = {
    taskId,
    action,
    status: 'queued',
    startedBy: auth.userId,
    queuedAt: new Date().toISOString(),
  }
  jobs.set(taskId, job)

  setTimeout(async () => {
    const current = jobs.get(taskId)
    if (!current) return

    current.status = 'running'
    current.startedAt = new Date().toISOString()
    jobs.set(taskId, current)

    try {
      await runTaskExecution(taskId, auth, action, options)
      const completed = jobs.get(taskId)
      if (!completed) return
      completed.status = 'completed'
      completed.completedAt = new Date().toISOString()
      jobs.set(taskId, completed)
    } catch (error) {
      const failed = jobs.get(taskId)
      if (!failed) return
      failed.status = 'failed'
      failed.completedAt = new Date().toISOString()
      failed.error = error instanceof Error ? error.message : 'Task execution failed.'
      jobs.set(taskId, failed)
    }
  }, 25)

  return job
}
