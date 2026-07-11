import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'
import { resolveAuthContextFromToken, getAuthTokenFromRequest } from '@/lib/auth/server'

function getBearerToken(req: NextRequest) {
  // Batch P.2: cookie OR bearer. Local wrapper kept so call sites don't change.
  return getAuthTokenFromRequest(req)
}

/** Compute the wall-clock timestamp for the next scheduled run. */
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
    const target = task.day_of_week ?? 1 // default Monday
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

// ─── GET /api/scheduled-tasks ─────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await resolveAuthContextFromToken(getBearerToken(req))
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!auth.tenantId) return NextResponse.json({ tasks: [] })

  try {
    const db = getDb()
    const rows = await db`
      SELECT * FROM scheduled_tasks
      WHERE tenant_id = ${auth.tenantId}
      ORDER BY created_at DESC
    `
    return NextResponse.json({ tasks: rows })
  } catch (err) {
    console.error('[scheduled-tasks GET]', err)
    return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 })
  }
}

// ─── POST /api/scheduled-tasks ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await resolveAuthContextFromToken(getBearerToken(req))
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!auth.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const body = await req.json()
  const {
    name,
    description = '',
    task_type = 'custom',
    prompt = '',
    agent_id = null,
    frequency = 'weekly',
    day_of_week = null,
    day_of_month = null,
    time_hour = 9,
    time_minute = 0,
  } = body

  if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  if (!prompt?.trim()) return NextResponse.json({ error: 'prompt is required' }, { status: 400 })

  const nextRunAt = computeNextRunAt({ frequency, day_of_week, day_of_month, time_hour, time_minute })

  try {
    const db = getDb()
    const [row] = await db`
      INSERT INTO scheduled_tasks
        (tenant_id, agent_id, created_by_user_id, name, description, task_type, prompt,
         frequency, day_of_week, day_of_month, time_hour, time_minute,
         status, next_run_at)
      VALUES
        (${auth.tenantId}, ${agent_id}, ${auth.userId}::uuid, ${name.trim()}, ${description}, ${task_type}, ${prompt.trim()},
         ${frequency}, ${day_of_week}, ${day_of_month}, ${time_hour}, ${time_minute},
         'active', ${nextRunAt?.toISOString() ?? null})
      RETURNING *
    `
    return NextResponse.json({ task: row }, { status: 201 })
  } catch (err) {
    console.error('[scheduled-tasks POST]', err)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
