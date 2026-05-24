/**
 * POST   /api/outputs/[id]/share — generate (or rotate) a share token for an output
 * DELETE /api/outputs/[id]/share — revoke the share token immediately
 *
 * Tokens default to 30-day expiry. Override with body.expiresInDays (1-365) on POST.
 * Only members of the output's tenant can create / revoke share links.
 */
import { randomUUID } from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'

import { resolveAuthContextFromToken, getAuthTokenFromRequest } from '@/lib/auth/server'
import { getDb } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

const DEFAULT_EXPIRY_DAYS = 30
const MAX_EXPIRY_DAYS = 365

function getBearerToken(req: NextRequest) {
  // Batch P.2: cookie OR bearer. Local wrapper kept so call sites don't change.
  return getAuthTokenFromRequest(req)
}

async function loadAuthorizedOutput(outputId: string, tenantId: string) {
  const db = getDb()
  const rows = await db`
    SELECT id, agency_id FROM outputs
    WHERE id = ${outputId}
      AND agency_id = ${tenantId}::uuid
    LIMIT 1
  `
  return rows[0] || null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!auth.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 })

    const { id: outputId } = await params
    const output = await loadAuthorizedOutput(outputId, auth.tenantId)
    if (!output) return NextResponse.json({ error: 'Output not found' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const requested = Number(body?.expiresInDays)
    const expiresInDays = Number.isFinite(requested) && requested > 0
      ? Math.min(Math.floor(requested), MAX_EXPIRY_DAYS)
      : DEFAULT_EXPIRY_DAYS

    const shareToken = randomUUID()
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)

    const db = getDb()
    await db`
      UPDATE outputs SET
        share_token      = ${shareToken}::uuid,
        share_expires_at = ${expiresAt.toISOString()},
        share_created_at = now(),
        share_created_by = ${auth.userId}::uuid,
        updated_at       = now()
      WHERE id = ${outputId}
    `

    return NextResponse.json({
      ok: true,
      shareToken,
      expiresAt: expiresAt.toISOString(),
      expiresInDays,
      shareUrl: `/share/output/${outputId}?t=${shareToken}`,
    })
  } catch (err: any) {
    console.error('POST /api/outputs/:id/share error:', err)
    return NextResponse.json({ error: err.message || 'Failed to create share token' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!auth.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 })

    const { id: outputId } = await params
    const output = await loadAuthorizedOutput(outputId, auth.tenantId)
    if (!output) return NextResponse.json({ error: 'Output not found' }, { status: 404 })

    const db = getDb()
    await db`
      UPDATE outputs SET
        share_token      = NULL,
        share_expires_at = NULL,
        share_created_at = NULL,
        share_created_by = NULL,
        updated_at       = now()
      WHERE id = ${outputId}
    `

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('DELETE /api/outputs/:id/share error:', err)
    return NextResponse.json({ error: err.message || 'Failed to revoke share token' }, { status: 500 })
  }
}
