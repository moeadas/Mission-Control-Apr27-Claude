import { NextRequest, NextResponse } from 'next/server'

import { getDb } from '@/lib/db/client'
import { resolveAuthContextFromToken, getAuthTokenFromRequest } from '@/lib/auth/server'

function getBearerToken(request: NextRequest) {
  // Batch P.2: cookie OR bearer. Local wrapper kept so call sites don't change.
  return getAuthTokenFromRequest(request)
}

/**
 * POST /api/admin/backfill-ownership
 *
 * Claims unassigned rows (where `owner_user_id IS NULL`) for the caller.
 * Tenant-scoped: only rows in the caller's tenant are touched. Available to
 * both tenant admins (own tenant) and super-admin. Super-admin can pass
 * `?tenantId=<uuid>` to backfill a specific tenant.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth || (auth.role !== 'super_admin' && auth.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = new URL(request.url)
    const requestedTenantId = url.searchParams.get('tenantId')
    const targetTenantId =
      auth.role === 'super_admin' && requestedTenantId
        ? requestedTenantId
        : auth.tenantId

    if (!targetTenantId) {
      return NextResponse.json({ error: 'No tenant in scope' }, { status: 400 })
    }

    const db = getDb()

    // Ensure this user has a profile row
    await db`
      INSERT INTO profiles (id, email, role, is_active, tenant_id)
      VALUES (${auth.userId}::uuid, ${auth.email}, ${auth.role}, true, ${targetTenantId}::uuid)
      ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, is_active = true
    `

    const updateTable = async (table: 'clients' | 'tasks' | 'outputs' | 'conversations') => {
      // Tenant-scoped — never touches rows outside the target tenant.
      const rows = await db.unsafe(
        `UPDATE "${table}" SET owner_user_id = $1 WHERE owner_user_id IS NULL AND agency_id = $2 RETURNING id`,
        [auth.userId, targetTenantId]
      )
      return rows.length
    }

    const [clients, tasks, outputs, conversations] = await Promise.all([
      updateTable('clients'),
      updateTable('tasks'),
      updateTable('outputs'),
      updateTable('conversations'),
    ])

    return NextResponse.json({
      success: true,
      tenantId: targetTenantId,
      counts: { clients, tasks, outputs, conversations },
    })
  } catch (error) {
    console.error('Failed to backfill ownership:', error)
    return NextResponse.json({ error: 'Failed to backfill ownership' }, { status: 500 })
  }
}
