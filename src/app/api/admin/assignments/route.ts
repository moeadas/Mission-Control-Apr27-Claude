import { NextRequest, NextResponse } from 'next/server'

import { getDb } from '@/lib/db/client'
import { resolveAuthContextFromToken, getAuthTokenFromRequest } from '@/lib/auth/server'

function getBearerToken(request: NextRequest) {
  // Batch P.2: cookie OR bearer. Local wrapper kept so call sites don't change.
  return getAuthTokenFromRequest(request)
}

type EntityType = 'client' | 'task' | 'output' | 'conversation'

/**
 * Reassign ownership of a tenant resource. Tenant-scoped: the caller must
 * be a tenant admin (or super_admin) AND the resource must live in their
 * tenant. Cross-tenant ownership transfers via this route are blocked.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth || (auth.role !== 'super_admin' && auth.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!auth.tenantId) {
      return NextResponse.json({ error: 'No tenant on session' }, { status: 400 })
    }

    const body = await request.json() as {
      entityType?: EntityType
      entityId?: string
      ownerUserId?: string | null
    }

    if (!body.entityType || !body.entityId) {
      return NextResponse.json({ error: 'Missing assignment payload' }, { status: 400 })
    }

    const db = getDb()
    const ownerUserId = body.ownerUserId || null

    // Verify the new owner (if any) belongs to the same tenant. Super-admin
    // bypasses to support cross-tenant manual ops.
    if (ownerUserId && auth.role !== 'super_admin') {
      const ownerCheck = await db`
        SELECT 1 FROM profiles
        WHERE id = ${ownerUserId}::uuid AND tenant_id = ${auth.tenantId}::uuid
        LIMIT 1
      `
      if (!ownerCheck[0]) {
        return NextResponse.json(
          { error: 'Target owner is not a member of your tenant' },
          { status: 403 }
        )
      }
    }

    // Tenant scope helper — only update rows that live in this tenant unless
    // the caller is super_admin doing platform-wide ops.
    const tenantScope = auth.role === 'super_admin' ? null : auth.tenantId

    if (body.entityType === 'client') {
      const rows = await db`
        UPDATE clients SET owner_user_id = ${ownerUserId}::uuid
        WHERE id = ${body.entityId}
          ${tenantScope ? db`AND agency_id = ${tenantScope}::uuid` : db``}
        RETURNING id
      `
      if (!rows[0]) return NextResponse.json({ error: 'Client not found in your tenant' }, { status: 404 })
      await Promise.all([
        db`UPDATE tasks         SET owner_user_id = ${ownerUserId}::uuid WHERE client_id = ${body.entityId} ${tenantScope ? db`AND agency_id = ${tenantScope}::uuid` : db``}`,
        db`UPDATE outputs       SET owner_user_id = ${ownerUserId}::uuid WHERE client_id = ${body.entityId} ${tenantScope ? db`AND agency_id = ${tenantScope}::uuid` : db``}`,
        db`UPDATE conversations SET owner_user_id = ${ownerUserId}::uuid WHERE client_id = ${body.entityId} ${tenantScope ? db`AND agency_id = ${tenantScope}::uuid` : db``}`,
      ])
    } else if (body.entityType === 'task') {
      const rows = await db`
        UPDATE tasks SET owner_user_id = ${ownerUserId}::uuid
        WHERE id = ${body.entityId}
          ${tenantScope ? db`AND agency_id = ${tenantScope}::uuid` : db``}
        RETURNING id
      `
      if (!rows[0]) return NextResponse.json({ error: 'Task not found in your tenant' }, { status: 404 })
      await Promise.all([
        db`UPDATE outputs       SET owner_user_id = ${ownerUserId}::uuid WHERE task_id = ${body.entityId} ${tenantScope ? db`AND agency_id = ${tenantScope}::uuid` : db``}`,
        db`UPDATE conversations SET owner_user_id = ${ownerUserId}::uuid WHERE task_id = ${body.entityId} ${tenantScope ? db`AND agency_id = ${tenantScope}::uuid` : db``}`,
      ])
    } else if (body.entityType === 'output') {
      const rows = await db`
        UPDATE outputs SET owner_user_id = ${ownerUserId}::uuid
        WHERE id = ${body.entityId}
          ${tenantScope ? db`AND agency_id = ${tenantScope}::uuid` : db``}
        RETURNING id
      `
      if (!rows[0]) return NextResponse.json({ error: 'Output not found in your tenant' }, { status: 404 })
    } else if (body.entityType === 'conversation') {
      const rows = await db`
        UPDATE conversations SET owner_user_id = ${ownerUserId}::uuid
        WHERE id = ${body.entityId}
          ${tenantScope ? db`AND agency_id = ${tenantScope}::uuid` : db``}
        RETURNING id
      `
      if (!rows[0]) return NextResponse.json({ error: 'Conversation not found in your tenant' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to assign ownership:', error)
    return NextResponse.json({ error: 'Failed to assign ownership' }, { status: 500 })
  }
}
