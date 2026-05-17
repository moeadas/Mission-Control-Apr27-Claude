/**
 * POST /api/agent-templates/clone
 *
 * Body: { templateIds: string[] }
 *
 * Clones one or more agent templates into the caller's tenant. Idempotent —
 * templates already cloned (tracked via `agents.metadata.templateId`) are
 * skipped, not duplicated.
 *
 * Plan-tier agent-limit check applies: if the cloning would exceed the
 * tenant's `agent_limit`, the response is 402 and nothing is inserted.
 *
 * Auth: any tenant member can clone templates into their tenant. Admins may
 * decide to lock this down later via a tenant-setting; for now everyone in
 * a tenant can contribute to the agent roster.
 */
import { NextRequest, NextResponse } from 'next/server'

import { resolveAuthContextFromToken } from '@/lib/auth/server'
import { cloneAgentTemplates, listAgentTemplates } from '@/lib/server/agent-templates'
import { canAddAgent, syncAgentCount } from '@/lib/server/tenants'

export const dynamic = 'force-dynamic'

function getBearerToken(req: NextRequest) {
  const h = req.headers.get('authorization') || ''
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : null
}

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!auth.tenantId) return NextResponse.json({ error: 'No tenant on session' }, { status: 400 })

    const body = await request.json().catch(() => ({}))
    const requestedIds = Array.isArray(body?.templateIds)
      ? body.templateIds.filter((id: unknown): id is string => typeof id === 'string')
      : []
    if (requestedIds.length === 0) {
      return NextResponse.json({ error: 'templateIds is required and must be a non-empty array' }, { status: 400 })
    }

    // Validate every requested id is a real template.
    const knownTemplateIds = new Set(listAgentTemplates().map((t) => t.id))
    const validIds = requestedIds.filter((id: string) => knownTemplateIds.has(id))
    const unknownIds = requestedIds.filter((id: string) => !knownTemplateIds.has(id))
    if (validIds.length === 0) {
      return NextResponse.json(
        { error: 'None of the provided templateIds match a known template', unknownIds },
        { status: 400 }
      )
    }

    // Plan-tier capacity check (only for net-new agents — re-clones are skipped).
    const capacity = await canAddAgent(auth.tenantId)
    if (!capacity.allowed && validIds.length > 0) {
      // canAddAgent returned a hard refusal — the tenant is already at the cap.
      return NextResponse.json(
        {
          error: `Agent limit reached. Your plan allows ${capacity.limit} agents (${capacity.current}/${capacity.limit}). Upgrade or remove an agent before cloning more.`,
          code: 'AGENT_LIMIT_EXCEEDED',
          limit: capacity.limit,
          current: capacity.current,
        },
        { status: 402 }
      )
    }

    const { insertedIds, skipped } = await cloneAgentTemplates(auth.tenantId, validIds)

    // Best-effort agent-count refresh; never block on this.
    syncAgentCount(auth.tenantId).catch(() => {})

    return NextResponse.json({
      ok: true,
      insertedIds,
      skipped,
      unknownIds,
    })
  } catch (err: any) {
    console.error('POST /api/agent-templates/clone error:', err)
    return NextResponse.json({ error: err.message || 'Failed to clone templates' }, { status: 500 })
  }
}
