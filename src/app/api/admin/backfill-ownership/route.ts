import { NextRequest, NextResponse } from 'next/server'

import { getDb } from '@/lib/db/client'
import { resolveAuthContextFromToken } from '@/lib/auth/server'

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim()
}

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth || auth.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const db = getDb()

    // Ensure this user has a profile row
    await db`
      INSERT INTO profiles (id, email, role, is_active)
      VALUES (${auth.userId}::uuid, ${auth.email}, 'super_admin', true)
      ON CONFLICT (id) DO UPDATE SET role = 'super_admin', is_active = true
    `

    const updateTable = async (table: 'clients' | 'tasks' | 'outputs' | 'conversations') => {
      const rows = await db.unsafe(
        `UPDATE "${table}" SET owner_user_id = $1 WHERE owner_user_id IS NULL RETURNING id`,
        [auth.userId]
      )
      return rows.length
    }

    const [clients, tasks, outputs, conversations] = await Promise.all([
      updateTable('clients'),
      updateTable('tasks'),
      updateTable('outputs'),
      updateTable('conversations'),
    ])

    return NextResponse.json({ success: true, counts: { clients, tasks, outputs, conversations } })
  } catch (error) {
    console.error('Failed to backfill ownership:', error)
    return NextResponse.json({ error: 'Failed to backfill ownership' }, { status: 500 })
  }
}
