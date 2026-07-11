import { NextRequest, NextResponse } from 'next/server'

import { resolveAuthContextFromToken, getAuthTokenFromRequest } from '@/lib/auth/server'
import { ensureTaskExists, loadTaskExecutionState } from '@/lib/server/task-execution'
import { getExecutionJobState, queueTaskExecution } from '@/lib/server/execution-queue'

export const dynamic = 'force-dynamic'

function getBearerToken(request: NextRequest) {
  // Batch P.2: cookie OR bearer. Local wrapper kept so call sites don't change.
  return getAuthTokenFromRequest(request)
}

function extractWebsiteAuditUrl(message: string) {
  const match = message.match(/\bhttps?:\/\/[^\s<>)"']+|\bwww\.[^\s<>)"']+|\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>)"']*)?/i)
  if (!match) return null
  const value = match[0].replace(/[.,;:!?]+$/, '')
  if (value.includes('@')) return null
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

function isWebsiteAuditBootstrap(body: {
  bootstrap?: { prompt?: string; title?: string; deliverableType?: string | null; pipelineId?: string | null }
}) {
  const text = `${body.bootstrap?.title || ''}\n${body.bootstrap?.prompt || ''}`
  const deliverableType = body.bootstrap?.deliverableType || ''
  const pipelineId = body.bootstrap?.pipelineId || ''
  return (
    deliverableType === 'seo-audit' ||
    deliverableType === 'ui-audit' ||
    pipelineId === 'seo-audit' ||
    /\b(seo audit|technical seo|website audit|site audit|audit my site|audit my website|website performance|performance analysis|pagespeed|core web vitals|lighthouse audit|ux\/ui|ui\/ux|ux audit|ui audit|website ux|website ui|conversion audit|cro audit)\b/i.test(text)
  )
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
        job: await getExecutionJobState(id),
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

    if (isWebsiteAuditBootstrap(body) && !extractWebsiteAuditUrl(`${body.bootstrap?.title || ''}\n${body.bootstrap?.prompt || ''}`)) {
      return NextResponse.json(
        {
          error: 'Please send the website URL before starting the website audit.',
          code: 'WEBSITE_URL_REQUIRED',
        },
        { status: 400 }
      )
    }

    if (body.bootstrap) {
      const ensured = await ensureTaskExists(id, auth, body.bootstrap)
      if (!ensured) {
        return NextResponse.json({ error: 'Unable to persist the task before queueing.' }, { status: 503 })
      }
    }

    const job = await queueTaskExecution(id, auth, action, {
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
