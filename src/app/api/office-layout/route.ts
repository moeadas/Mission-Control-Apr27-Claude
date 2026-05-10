import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'
import { resolveAuthContextFromToken } from '@/lib/auth/server'
import { DEFAULT_LAYOUT } from '@/lib/office-types'

function getBearerToken(req: NextRequest) {
  const h = req.headers.get('authorization') || ''
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : null
}

// GET /api/office-layout — returns the agency's saved layout (or default)
export async function GET(req: NextRequest) {
  const auth = await resolveAuthContextFromToken(getBearerToken(req))
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  try {
    const [row] = await db`
      SELECT layout, mc_credits, owned_assets
      FROM office_layouts
      WHERE agency_id = ${auth.tenantId}
      LIMIT 1
    `
    if (!row) {
      return NextResponse.json({
        layout: DEFAULT_LAYOUT,
        mcCredits: 0,
        ownedAssets: [],
      })
    }
    return NextResponse.json({
      layout: row.layout ?? DEFAULT_LAYOUT,
      mcCredits: row.mc_credits ?? 0,
      ownedAssets: row.owned_assets ?? [],
    })
  } catch (err) {
    console.error('[office-layout GET]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PUT /api/office-layout — upsert the agency's layout
export async function PUT(req: NextRequest) {
  const auth = await resolveAuthContextFromToken(getBearerToken(req))
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { layout } = body
  if (!layout) return NextResponse.json({ error: 'layout required' }, { status: 400 })

  const db = getDb()
  try {
    await db`
      INSERT INTO office_layouts (agency_id, layout, updated_at)
      VALUES (${auth.tenantId}, ${JSON.stringify(layout)}, now())
      ON CONFLICT (agency_id) DO UPDATE
        SET layout = EXCLUDED.layout,
            updated_at = now()
    `
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[office-layout PUT]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
