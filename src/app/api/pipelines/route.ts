import { NextRequest, NextResponse } from 'next/server'

import pipelinesConfig from '@/config/pipelines/pipelines.json'
import { getDb } from '@/lib/db/client'
import { resolveAuthContextFromToken } from '@/lib/auth/server'

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

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const agencyId = await getAgencyId()
    if (!agencyId) return NextResponse.json(pipelinesConfig.pipelines || [])

    const db = getDb()
    const rows = await db`
      SELECT * FROM pipelines
      WHERE agency_id = ${agencyId}
      ORDER BY name ASC
    `

    return NextResponse.json(rows.map((row: any) => row.definition || {}))
  } catch (error) {
    console.error('Failed to load pipelines:', error)
    return NextResponse.json({ error: 'Failed to load pipelines' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth || auth.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const pipeline = await request.json()
    const agencyId = await getAgencyId()
    if (!agencyId) return NextResponse.json({ error: 'Database not available' }, { status: 503 })

    const db = getDb()
    await db`
      INSERT INTO pipelines (id, agency_id, name, description, version, is_default, estimated_duration, definition, source)
      VALUES (
        ${pipeline.id},
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
