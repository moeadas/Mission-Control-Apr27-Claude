/**
 * GET /api/scheduled-tasks/tick
 *
 * Called every minute by a VPS crontab:
 *   * * * * * curl -sf -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/scheduled-tasks/tick
 *
 * Finds all active tasks whose next_run_at <= now, then fires each one.
 * Uses the agent's assigned provider/model as priority 0 in routing.
 * Logs token usage after each run.
 *
 * Auth: Bearer token must match CRON_SECRET env var.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'
import { loadPersistedProviderSettings } from '@/lib/server/provider-secrets'
import { executeScheduledTaskThroughOrchestrator } from '@/lib/server/scheduled-task-execution'
import type { AuthContext } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

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

async function runTask(db: any, task: any) {
  await db`UPDATE scheduled_tasks SET last_run_at = now(), updated_at = now() WHERE id = ${task.id}`

  try {
    // Load provider settings for the tenant's owner
    // profiles.id = users.id (no separate user_id column)
    const [ownerProfile] = await db`
      SELECT u.id, u.email, u.role FROM profiles p
      JOIN users u ON u.id = p.id
      WHERE p.tenant_id = ${task.tenant_id}
      ORDER BY CASE WHEN u.id = ${task.created_by_user_id || null}::uuid THEN 0 ELSE 1 END, u.created_at ASC
      LIMIT 1
    `
    const ownerUserId = ownerProfile?.id || null
    const savedSettings = ownerUserId ? await loadPersistedProviderSettings(ownerUserId) : null
    if (!ownerProfile) throw new Error('Scheduled task tenant has no active owner.')
    const auth: AuthContext = {
      userId: ownerProfile.id,
      email: ownerProfile.email,
      role: ownerProfile.role,
      tenantId: task.tenant_id,
      providerSettings: savedSettings || ({} as AuthContext['providerSettings']),
    }
    const { output } = await executeScheduledTaskThroughOrchestrator({ task, auth })

    const nextRunAt = computeNextRunAt(task as any)

    await db`
      UPDATE scheduled_tasks
      SET
        last_run_status  = 'success',
        last_run_output  = ${output},
        run_count        = run_count + 1,
        next_run_at      = ${nextRunAt?.toISOString() ?? null},
        status           = CASE WHEN frequency = 'once' THEN 'completed' ELSE status END,
        updated_at       = now()
      WHERE id = ${task.id}
    `
    return { id: task.id, status: 'success' }
  } catch (err: any) {
    const errMsg = err?.message || 'Unknown error'
    const nextRunAt = computeNextRunAt(task as any)
    await db`
      UPDATE scheduled_tasks
      SET last_run_status = 'error',
          last_run_output = ${errMsg},
          run_count       = run_count + 1,
          next_run_at     = ${nextRunAt?.toISOString() ?? null},
          updated_at      = now()
      WHERE id = ${task.id}
    `
    return { id: task.id, status: 'error', error: errMsg }
  }
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : null

  if (!cronSecret || token !== cronSecret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const db = getDb()

    const due = await db`
      UPDATE scheduled_tasks
      SET next_run_at = NULL
      WHERE status = 'active'
        AND next_run_at IS NOT NULL
        AND next_run_at <= now()
      RETURNING *
    `

    if (due.length === 0) {
      return NextResponse.json({ ran: 0, results: [] })
    }

    const results = await Promise.allSettled(due.map((task: any) => runTask(db, task)))
    const summary = results.map((r, i) =>
      r.status === 'fulfilled' ? r.value : { id: due[i].id, status: 'error', error: 'Promise rejected' }
    )

    console.log(`[tick] Ran ${due.length} scheduled tasks:`, summary)
    return NextResponse.json({ ran: due.length, results: summary })
  } catch (err: any) {
    console.error('[tick] Fatal error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
