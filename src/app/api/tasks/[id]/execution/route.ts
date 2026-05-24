import { NextRequest, NextResponse } from 'next/server'

import { resolveAuthContextFromToken, getAuthTokenFromRequest } from '@/lib/auth/server'
import { loadTaskExecutionState } from '@/lib/server/task-execution'
import { getExecutionJobState, queueTaskExecution } from '@/lib/server/execution-queue'

export const dynamic = 'force-dynamic'

function getBearerToken(request: NextRequest) {
  // Batch P.2: cookie OR bearer. Local wrapper kept so call sites don't change.
  return getAuthTokenFromRequest(request)
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const state = await loadTaskExecutionState(id, auth)
    if (!state) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json(
      {
        ...state,
        job: getExecutionJobState(id),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('[GET /api/tasks/:id/execution]', error)
    return NextResponse.json({ error: 'Failed to load task execution state.' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const body = (await request.json().catch(() => ({}))) as {
      action?: 'retry' | 'resume'
      comment?: string
      runtimeMode?: 'fast' | 'thinking' | 'compare'
      bootstrap?: {
        prompt?: string
        title?: string
        deliverableType?: string | null
        leadAgentId?: string | null
        collaboratorAgentIds?: string[] | null
        pipelineId?: string | null
        clientId?: string | null
      }
    }
    const action = body.action === 'resume' ? 'resume' : 'retry'

    const job = queueTaskExecution(id, auth, action, {
      comment: body.comment?.trim() || undefined,
      runtimeMode: body.runtimeMode,
      bootstrap: body.bootstrap,
    })

    return NextResponse.json(
      {
        ok: true,
        queued: true,
        job,
      },
      { status: 202 }
    )
  } catch (error) {
    console.error('[POST /api/tasks/:id/execution]', error)
    const message = error instanceof Error ? error.message : 'Failed to execute task.'
    const status = message === 'Unauthorized' ? 403 : message === 'Task not found.' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
