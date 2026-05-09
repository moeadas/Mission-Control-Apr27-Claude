import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'
import { resolveAuthContextFromToken } from '@/lib/auth/server'

function getBearerToken(req: NextRequest) {
  const h = req.headers.get('authorization') || ''
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : null
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

// ─── PATCH /api/scheduled-tasks/[id] ──────────────────────────────────────────

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const auth = await resolveAuthContextFromToken(getBearerToken(req))
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const body = await req.json()

  const allowedKeys = [
    'name', 'description', 'task_type', 'prompt', 'agent_id',
    'frequency', 'day_of_week', 'day_of_month', 'time_hour', 'time_minute', 'status',
  ]

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowedKeys) {
    if (key in body) updates[key] = body[key] ?? null
  }

  const scheduleKeys = ['frequency', 'day_of_week', 'day_of_month', 'time_hour', 'time_minute']
  const scheduleChanged = scheduleKeys.some((k) => k in body)

  try {
    const db = getDb()

    if (scheduleChanged) {
      const [current] = await db`
        SELECT frequency, day_of_week, day_of_month, time_hour, time_minute
        FROM scheduled_tasks WHERE id = ${id} AND tenant_id = ${auth.tenantId}
      `
      if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      const merged = { ...current, ...updates }
      updates.next_run_at = computeNextRunAt(merged as any)?.toISOString() ?? null
    }

    // postgres.js: db(object) in SET context generates "col1 = $1, col2 = $2 ..."
    const [row] = await db`
      UPDATE scheduled_tasks
      SET ${db(updates)}
      WHERE id = ${id} AND tenant_id = ${auth.tenantId}
      RETURNING *
    `
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ task: row })
  } catch (err) {
    console.error('[scheduled-tasks PATCH]', err)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

// ─── DELETE /api/scheduled-tasks/[id] ─────────────────────────────────────────

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const auth = await resolveAuthContextFromToken(getBearerToken(req))
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params

  try {
    const db = getDb()
    await db`DELETE FROM scheduled_tasks WHERE id = ${id} AND tenant_id = ${auth.tenantId}`
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[scheduled-tasks DELETE]', err)
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}
