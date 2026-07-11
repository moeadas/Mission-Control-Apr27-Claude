import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'
import { resolveAuthContextFromToken, getAuthTokenFromRequest } from '@/lib/auth/server'
import { executeScheduledTaskThroughOrchestrator } from '@/lib/server/scheduled-task-execution'
// auth.providerSettings is already loaded from provider-secrets in resolveAuthContextFromToken

function getBearerToken(req: NextRequest) {
  // Batch P.2: cookie OR bearer. Local wrapper kept so call sites don't change.
  return getAuthTokenFromRequest(req)
}

function computeNextRunAt(task: {
  frequency: string
  day_of_week?: number | null
  day_of_month?: number | null
  time_hour: number
  time_minute: number
}): Date | null {
  if (task.frequency === 'once') return null

  const now = new Date()
  const next = new Date(now)
  next.setSeconds(0, 0)
  next.setHours(task.time_hour, task.time_minute, 0, 0)

  if (task.frequency === 'daily') {
    if (next <= now) next.setDate(next.getDate() + 1)
    return next
  }

  if (task.frequency === 'weekly') {
    const target = task.day_of_week ?? 1
    const current = next.getDay()
    let daysUntil = target - current
    if (daysUntil < 0) daysUntil += 7
    if (daysUntil === 0 && next <= now) daysUntil = 7
    next.setDate(next.getDate() + daysUntil)
    return next
  }

  if (task.frequency === 'monthly') {
    const dom = task.day_of_month ?? 1
    next.setDate(dom)
    if (next <= now) next.setMonth(next.getMonth() + 1, dom)
    return next
  }

  return null
}

type RouteContext = { params: Promise<{ id: string }> }

// ─── POST /api/scheduled-tasks/[id]/run ───────────────────────────────────────

export async function POST(req: NextRequest, ctx: RouteContext) {
  const auth = await resolveAuthContextFromToken(getBearerToken(req))
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const db = getDb()

  // Load the task
  const [task] = await db`
    SELECT * FROM scheduled_tasks
    WHERE id = ${id} AND tenant_id = ${auth.tenantId}
  `
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Mark as running (optimistic)
  await db`
    UPDATE scheduled_tasks
    SET last_run_at = now(), updated_at = now()
    WHERE id = ${id}
  `

  try {
    const { output, taskId } = await executeScheduledTaskThroughOrchestrator({ task, auth })

    // Compute next run
    const nextRunAt = computeNextRunAt(task as any)

    // Persist success
    const [updated] = await db`
      UPDATE scheduled_tasks
      SET
        last_run_at      = now(),
        last_run_status  = 'success',
        last_run_output  = ${output},
        run_count        = run_count + 1,
        next_run_at      = ${nextRunAt?.toISOString() ?? null},
        status           = CASE WHEN frequency = 'once' THEN 'completed' ELSE status END,
        updated_at       = now()
      WHERE id = ${id}
      RETURNING *
    `

    return NextResponse.json({ task: updated, output, executionTaskId: taskId })
  } catch (err: any) {
    const errMsg = err?.message || 'Unknown execution error'
    console.error('[scheduled-tasks/run]', errMsg)

    await db`
      UPDATE scheduled_tasks
      SET
        last_run_status  = 'error',
        last_run_output  = ${errMsg},
        run_count        = run_count + 1,
        updated_at       = now()
      WHERE id = ${id}
    `

    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
