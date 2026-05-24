/**
 * Resource Access Control (Batch C)
 *
 * Tenant admins (role=admin or super_admin) use this endpoint to restrict who
 * can see a specific client / task / output within their tenant.
 *
 *   • Empty array → "shared with the whole tenant" (default).
 *   • Non-empty   → "only listed users + tenant admins / super_admin".
 *
 * GET   /api/admin/resource-access?entityType=client&entityId=xxx
 *        Returns: { assignedUserIds: string[] }
 *
 * PUT   /api/admin/resource-access
 *        Body:  { entityType: 'client'|'task'|'output', entityId, assignedUserIds: string[] }
 *        Returns: { ok: true, assignedUserIds }
 */
import { NextRequest, NextResponse } from 'next/server'

import { resolveAuthContextFromToken, getAuthTokenFromRequest } from '@/lib/auth/server'
import { getDb } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

type EntityType = 'client' | 'task' | 'output'
const VALID_ENTITY_TYPES: EntityType[] = ['client', 'task', 'output']

function getBearerToken(req: NextRequest) {
  // Batch P.2: cookie OR bearer. Local wrapper kept so call sites don't change.
  return getAuthTokenFromRequest(req)
}

async function requireTenantAdmin(req: NextRequest) {
  const auth = await resolveAuthContextFromToken(getBearerToken(req))
  if (!auth) return { auth: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (auth.role !== 'super_admin' && auth.role !== 'admin') {
    return { auth: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  if (!auth.tenantId) {
    return { auth: null, error: NextResponse.json({ error: 'No tenant on session' }, { status: 400 }) }
  }
  return { auth, error: null as null | NextResponse }
}

function tableForEntity(entityType: EntityType): 'clients' | 'tasks' | 'outputs' {
  if (entityType === 'client') return 'clients'
  if (entityType === 'task') return 'tasks'
  return 'outputs'
}

export async function GET(request: NextRequest) {
  const { auth, error } = await requireTenantAdmin(request)
  if (!auth) return error!

  const url = new URL(request.url)
  const entityType = url.searchParams.get('entityType') as EntityType | null
  const entityId = url.searchParams.get('entityId')

  if (!entityType || !VALID_ENTITY_TYPES.includes(entityType) || !entityId) {
    return NextResponse.json({ error: 'entityType and entityId are required' }, { status: 400 })
  }

  try {
    const db = getDb()
    const table = tableForEntity(entityType)
    const rows = await db.unsafe(
      `SELECT assigned_user_ids FROM "${table}" WHERE id = $1 AND agency_id = $2 LIMIT 1`,
      [entityId, auth.tenantId]
    )
    const row = rows[0]
    if (!row) return NextResponse.json({ error: `${entityType} not found in your tenant` }, { status: 404 })

    return NextResponse.json({
      ok: true,
      assignedUserIds: Array.isArray(row.assigned_user_ids) ? row.assigned_user_ids : [],
    })
  } catch (err: any) {
    console.error('GET /api/admin/resource-access error:', err)
    return NextResponse.json({ error: err.message || 'Failed to load access list' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const { auth, error } = await requireTenantAdmin(request)
  if (!auth) return error!

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const entityType = body?.entityType as EntityType | undefined
  const entityId = body?.entityId as string | undefined
  const rawList = body?.assignedUserIds

  if (!entityType || !VALID_ENTITY_TYPES.includes(entityType) || !entityId) {
    return NextResponse.json({ error: 'entityType and entityId are required' }, { status: 400 })
  }
  if (!Array.isArray(rawList)) {
    return NextResponse.json({ error: 'assignedUserIds must be an array of user ids (empty = shared)' }, { status: 400 })
  }

  // De-dupe + UUID-shape sanity check.
  const assignedUserIds = Array.from(
    new Set(
      rawList.filter(
        (id): id is string =>
          typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      )
    )
  )

  try {
    const db = getDb()

    // All assigned users must belong to the same tenant (super_admin bypass).
    if (assignedUserIds.length > 0 && auth.role !== 'super_admin') {
      const validation = await db`
        SELECT id FROM profiles
        WHERE id = ANY (${assignedUserIds as any}::uuid[])
          AND tenant_id = ${auth.tenantId}::uuid
      `
      if (validation.length !== assignedUserIds.length) {
        return NextResponse.json(
          { error: 'One or more users are not members of your tenant' },
          { status: 403 }
        )
      }
    }

    const table = tableForEntity(entityType)
    const updated = await db.unsafe(
      `UPDATE "${table}" SET assigned_user_ids = $1::uuid[], updated_at = now()
       WHERE id = $2 AND agency_id = $3
       RETURNING assigned_user_ids`,
      [assignedUserIds, entityId, auth.tenantId]
    )
    if (!updated[0]) return NextResponse.json({ error: `${entityType} not found in your tenant` }, { status: 404 })

    return NextResponse.json({
      ok: true,
      entityType,
      entityId,
      assignedUserIds: updated[0].assigned_user_ids ?? [],
    })
  } catch (err: any) {
    console.error('PUT /api/admin/resource-access error:', err)
    return NextResponse.json({ error: err.message || 'Failed to update access list' }, { status: 500 })
  }
}
