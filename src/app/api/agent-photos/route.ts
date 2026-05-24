/**
 * GET /api/agent-photos
 * Returns the photo map filtered to the caller's tenant's agents.
 * Prevents cross-tenant enumeration of uploaded photos.
 */
import { NextRequest, NextResponse } from 'next/server'

import { resolveAuthContextFromToken, getAuthTokenFromRequest } from '@/lib/auth/server'
import { readAgentPhotoMap } from '@/lib/server/agent-photos'
import { getDb } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

function getBearerToken(request: NextRequest) {
  // Batch P.2: cookie OR bearer. Local wrapper kept so call sites don't change.
  return getAuthTokenFromRequest(request)
}

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [allPhotos, tenantAgents] = await Promise.all([
      readAgentPhotoMap(),
      getDb()`SELECT id FROM agents WHERE agency_id = ${auth.tenantId}::uuid`,
    ])

    const tenantAgentIds = new Set(tenantAgents.map((row: any) => row.id))
    const photos = Object.fromEntries(
      Object.entries(allPhotos).filter(([agentId]) => tenantAgentIds.has(agentId))
    )

    return NextResponse.json(
      { photos },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    )
  } catch (error) {
    console.error('Failed to load agent photos:', error)
    return NextResponse.json({ error: 'Failed to load agent photos' }, { status: 500 })
  }
}
