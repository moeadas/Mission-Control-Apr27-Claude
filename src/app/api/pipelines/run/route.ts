import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

import { resolveAuthContextFromToken } from '@/lib/auth/server'
import { getDb } from '@/lib/db/client'
import { queueTaskExecution } from '@/lib/server/execution-queue'
import { inferDeliverableType } from '@/lib/intents/intent-classifier'
import { getDeliverableSpec } from '@/lib/intents/deliverable-registry'

/**
 * POST /api/pipelines/run
 *
 * Replaces the dead client-side execution loop in `pipeline-execution.ts` that
 * used to fetch `/api/chat` once per pipeline activity. The new flow:
 *
 *   client posts { pipelineId, clientId, request, language? }
 *     →  this endpoint creates a task row in Supabase (matching the same
 *        shape /api/chat creates for chat-driven tasks)
 *     →  this endpoint queues `runTaskExecution` via the existing
 *        execution-queue module — that function uses
 *        `executeAutonomousTask`, which is the single canonical orchestrator
 *     →  client navigates to /tasks/<id> and watches the live workflow_runs
 *        + task_runs feed
 *
 * No HTTP loops, no per-activity authentication, no duplicate orchestration.
 *
 * Request body:
 *   pipelineId — id from the pipelines table or the bundled config
 *   clientId   — Supabase client id (must be owned by the user, super_admin
 *                bypasses the check)
 *   request    — free-text task description used as the run prompt
 *   language   — optional, currently only 'en'/'ar'
 */

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim()
}

async function getAgencyId(): Promise<string | null> {
  try {
    const db = getDb()
    const rows = await db`SELECT id FROM agencies WHERE slug = 'default-agency' LIMIT 1`
    return rows[0]?.id ?? null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await request.json().catch(() => null)) as {
      pipelineId?: string
      clientId?: string | null
      request?: string
      language?: 'en' | 'ar'
      runtimeMode?: 'fast' | 'thinking' | 'compare'
    } | null

    if (!body?.pipelineId) {
      return NextResponse.json({ error: 'pipelineId is required' }, { status: 400 })
    }
    if (!body.request || !body.request.trim()) {
      return NextResponse.json({ error: 'request is required' }, { status: 400 })
    }

    const agencyId = await getAgencyId()
    if (!agencyId) {
      return NextResponse.json({ error: 'Persistence layer is unavailable.' }, { status: 503 })
    }

    const db = getDb()

    // If a clientId is provided, enforce ownership for non-admins.
    if (body.clientId) {
      const clientRows = await db`
        SELECT id, owner_user_id FROM clients
        WHERE agency_id = ${agencyId} AND id = ${body.clientId}
        LIMIT 1
      `
      if (!clientRows[0]) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }
      if (
        auth.role !== 'super_admin' &&
        clientRows[0].owner_user_id &&
        clientRows[0].owner_user_id !== auth.userId
      ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Resolve the pipeline definition so we can record it on the task.
    const pipelineRows = await db`
      SELECT definition FROM pipelines
      WHERE agency_id = ${agencyId} AND id = ${body.pipelineId}
      LIMIT 1
    `

    let pipelineName: string | null = null
    if (pipelineRows[0]?.definition) {
      pipelineName =
        (pipelineRows[0].definition as any).name || (pipelineRows[0].definition as any).label || null
    }
    if (!pipelineName) {
      try {
        const config = await import('@/config/pipelines/pipelines.json')
        const match = (config.default.pipelines || []).find((p: any) => p.id === body.pipelineId)
        if (match) pipelineName = match.name
      } catch {
        // fall through with null name
      }
    }

    // Choose the deliverable type via the canonical classifier so the
    // autonomous task runner picks the right channeling/quality settings.
    const deliverableType = inferDeliverableType(body.request)
    const spec = getDeliverableSpec(deliverableType)

    // Create the task row.
    const taskId = uuidv4()
    const now = new Date().toISOString()
    await db`
      INSERT INTO tasks (
        id, agency_id, owner_user_id, client_id, title, summary, deliverable_type,
        status, priority, pipeline_id, lead_agent_id, progress, execution_plan,
        created_at, updated_at
      ) VALUES (
        ${taskId},
        ${agencyId},
        ${auth.userId},
        ${body.clientId || null},
        ${'Pipeline run: ' + (pipelineName || body.pipelineId)},
        ${body.request},
        ${deliverableType},
        'queued',
        'medium',
        ${body.pipelineId},
        ${spec.defaultLead || null},
        ${0},
        ${db.json({ source: 'pipeline-runner', pipelineName, runtimeMode: body.runtimeMode || 'fast' })},
        ${now},
        ${now}
      )
    `

    // Queue execution through the existing in-process queue. Uses
    // runTaskExecution → executeAutonomousTask under the hood, so pipeline
    // runs go through the same orchestration as chat-driven tasks.
    const job = queueTaskExecution(taskId, auth, 'retry', {
      runtimeMode: body.runtimeMode,
    })

    return NextResponse.json(
      {
        ok: true,
        taskId,
        pipelineId: body.pipelineId,
        pipelineName,
        deliverableType,
        job,
      },
      { status: 202 }
    )
  } catch (error) {
    console.error('[POST /api/pipelines/run]', error)
    const message = error instanceof Error ? error.message : 'Failed to start pipeline.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
