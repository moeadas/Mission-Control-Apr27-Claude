import { NextRequest, NextResponse } from 'next/server'

import pipelinesConfig from '@/config/pipelines/pipelines.json'
import { getDb } from '@/lib/db/client'
import { resolveAuthContextFromToken, getAuthTokenFromRequest } from '@/lib/auth/server'

function getBearerToken(request: NextRequest) {
  // Batch P.2: cookie OR bearer. Local wrapper kept so call sites don't change.
  return getAuthTokenFromRequest(request)
}

function parsePipelineDefinition(value: any) {
  if (!value) return null
  if (typeof value === 'object') return value
  if (typeof value !== 'string') return null
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function mergeWithBundledDefaults(rows: any[]) {
  const defaults = Array.isArray(pipelinesConfig.pipelines) ? pipelinesConfig.pipelines : []
  const merged = new Map<string, any>()

  for (const pipeline of defaults) {
    if (pipeline?.id && pipeline?.name) {
      merged.set(pipeline.id, pipeline)
    }
  }

  for (const row of rows) {
    const definition = parsePipelineDefinition(row.definition)
    if (row.source === 'config' && definition?.id && merged.has(definition.id)) {
      continue
    }
    if (definition?.id && definition?.name) {
      merged.set(definition.id, definition)
    }
  }

  return Array.from(merged.values()).sort((a, b) => String(a.name).localeCompare(String(b.name)))
}

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const agencyId = auth.tenantId
    if (!agencyId) return NextResponse.json(pipelinesConfig.pipelines || [])

    const db = getDb()
    const rows = await db`
      SELECT * FROM pipelines
      WHERE agency_id = ${agencyId}
      ORDER BY name ASC
    `

    // Always include bundled defaults. Tenant DB rows can override matching
    // IDs, but malformed/stale rows should never make the default library
    // disappear from the UI.
    return NextResponse.json(mergeWithBundledDefaults(rows as any[]))
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
    const agencyId = auth.tenantId
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
        ${db.json(pipeline)},
        'app'
      )
      ON CONFLICT (agency_id, id) DO UPDATE SET
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
