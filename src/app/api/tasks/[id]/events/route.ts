/**
 * GET /api/tasks/[id]/events  — Server-Sent Events stream
 *
 * Subscribers (IrisChat, the Live Task Tracker) hit this with the task id;
 * the route polls `task_events` for new rows every ~700 ms and pushes each
 * event as a discrete SSE message. The stream closes once a `done` or
 * `error` event lands.
 *
 * Auth: standard Bearer header. The task must belong to the caller's
 * tenant (or super-admin bypass).
 *
 * Connection lifetime is bounded by `MAX_STREAM_MS` (5 min) so we never
 * pin a Node socket forever — the client reconnects if it needs more.
 */
import { NextRequest } from 'next/server'

import { resolveAuthContextFromToken } from '@/lib/auth/server'
import { getDb } from '@/lib/db/client'
import { isTaskTerminal, listTaskEventsSince } from '@/lib/server/task-events'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const POLL_INTERVAL_MS = 700
const MAX_STREAM_MS = 5 * 60 * 1000

function getToken(request: NextRequest) {
  const h = request.headers.get('authorization') || ''
  if (h.toLowerCase().startsWith('bearer ')) return h.slice(7).trim()
  // Fallback for EventSource which cannot set custom headers — accept
  // a `?token=…` query string (same pattern used by file-serving routes).
  return new URL(request.url).searchParams.get('token')
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getToken(request)
  const auth = await resolveAuthContextFromToken(token)
  if (!auth || !auth.tenantId) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { id: taskId } = await params

  // Verify the task lives in the caller's tenant (or caller is super-admin).
  const db = getDb()
  const taskRows = await db`SELECT id, agency_id FROM tasks WHERE id = ${taskId} LIMIT 1`
  const task = taskRows[0]
  if (!task) return new Response('Not found', { status: 404 })
  if (auth.role !== 'super_admin' && task.agency_id !== auth.tenantId) {
    return new Response('Forbidden', { status: 403 })
  }

  const encoder = new TextEncoder()
  let lastEventId = 0
  let cancelled = false
  const startedAt = Date.now()

  const stream = new ReadableStream({
    async start(controller) {
      function send(eventType: string, data: any) {
        if (cancelled) return
        const line =
          `event: ${eventType}\n` +
          `data: ${JSON.stringify(data)}\n\n`
        try {
          controller.enqueue(encoder.encode(line))
        } catch {
          cancelled = true
        }
      }

      // Initial "open" frame so the client can react immediately.
      send('open', { taskId, startedAt: new Date().toISOString() })

      // Replay any events that already exist (catches up missed history).
      try {
        const backlog = await listTaskEventsSince(taskId, 0)
        for (const row of backlog) {
          send(row.event_type, row)
          lastEventId = Math.max(lastEventId, row.id)
        }
        // If the task already finished before we connected, close now.
        if (await isTaskTerminal(taskId)) {
          send('close', { reason: 'already-terminal' })
          controller.close()
          return
        }
      } catch (err) {
        send('error', { message: 'failed to read backlog', err: String(err) })
      }

      // Poll loop.
      const loop = async () => {
        while (!cancelled && Date.now() - startedAt < MAX_STREAM_MS) {
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
          if (cancelled) break
          try {
            const events = await listTaskEventsSince(taskId, lastEventId)
            for (const row of events) {
              send(row.event_type, row)
              lastEventId = Math.max(lastEventId, row.id)
              if (row.event_type === 'done' || row.event_type === 'error') {
                send('close', { reason: row.event_type })
                cancelled = true
                try { controller.close() } catch { /* already closed */ }
                return
              }
            }
            // Heartbeat every ~10s so proxies don't drop us.
            const elapsed = Date.now() - startedAt
            if (elapsed > 0 && elapsed % 10000 < POLL_INTERVAL_MS) {
              send('ping', { at: new Date().toISOString() })
            }
          } catch (err) {
            send('error', { message: 'poll failed', err: String(err) })
          }
        }
        if (!cancelled) {
          send('close', { reason: 'max-stream-elapsed' })
          try { controller.close() } catch { /* */ }
        }
      }
      loop()
    },
    cancel() {
      cancelled = true
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',   // disable nginx/proxy buffering
    },
  })
}
