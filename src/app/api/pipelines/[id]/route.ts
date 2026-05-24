import { NextRequest, NextResponse } from 'next/server'

import { getDb } from '@/lib/db/client'
import { resolveAuthContextFromToken, getAuthTokenFromRequest } from '@/lib/auth/server'

function getBearerToken(request: NextRequest) {
  // Batch P.2: cookie OR bearer. Local wrapper kept so call sites don't change.
  return getAuthTokenFromRequest(request)
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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const agencyId = await getAgencyId()
    if (!agencyId) return NextResponse.json({ error: 'Database not available' }, { status: 503 })

    const db = getDb()
    const rows = await db`
      SELECT * FROM pipelines WHERE agency_id = ${agencyId} AND id = ${id} LIMIT 1
    `
    if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(rows[0].definition || {})
  } catch (error) {
    console.error('Failed to load pipeline:', error)
    return NextResponse.json({ error: 'Failed to load pipeline' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth || auth.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const pipeline = await request.json()
    const agencyId = await getAgencyId()
    if (!agencyId) return NextResponse.json({ error: 'Database not available' }, { status: 503 })

    const db = getDb()
    await db`
      INSERT INTO pipelines (id, agency_id, name, description, version, is_default, estimated_duration, definition, source)
      VALUES (
        ${id},
        ${agencyId},
        ${pipeline.name},
        ${pipeline.description || ''},
        ${pipeline.version || '1.0'},
        ${Boolean(pipeline.isDefault)},
        ${pipeline.estimatedDuration || null},
        ${JSON.stringify(pipeline)},
        'app'
      )
      ON CONFLICT (id) DO UPDATE SET
        agency_id = EXCLUDED.agency_id,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        version = EXCLUDED.version,
        is_default = EXCLUDED.is_default,
        estimated_duration = EXCLUDED.estimated_duration,
        definition = EXCLUDED.definition,
        source = EXCLUDED.source
    `
    return NextResponse.json({ success: true, pipeline })
  } catch (error) {
    console.error('Failed to save pipeline:', error)
    return NextResponse.json({ error: 'Failed to save pipeline' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth || auth.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const agencyId = await getAgencyId()
    if (!agencyId) return NextResponse.json({ error: 'Database not available' }, { status: 503 })

    const db = getDb()
    await db`DELETE FROM pipelines WHERE agency_id = ${agencyId} AND id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete pipeline:', error)
    return NextResponse.json({ error: 'Failed to delete pipeline' }, { status: 500 })
  }
}
