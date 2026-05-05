import { NextRequest, NextResponse } from 'next/server'

import { getDb } from '@/lib/db/client'
import { resolveAuthContextFromToken } from '@/lib/auth/server'

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim()
}

type EntityType = 'client' | 'task' | 'output' | 'conversation'

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth || auth.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

    if (body.entityType === 'client') {
      await db`UPDATE clients SET owner_user_id = ${ownerUserId}::uuid WHERE id = ${body.entityId}`
      await Promise.all([
        db`UPDATE tasks         SET owner_user_id = ${ownerUserId}::uuid WHERE client_id = ${body.entityId}`,
        db`UPDATE outputs       SET owner_user_id = ${ownerUserId}::uuid WHERE client_id = ${body.entityId}`,
        db`UPDATE conversations SET owner_user_id = ${ownerUserId}::uuid WHERE client_id = ${body.entityId}`,
      ])
    } else if (body.entityType === 'task') {
      await db`UPDATE tasks SET owner_user_id = ${ownerUserId}::uuid WHERE id = ${body.entityId}`
      await Promise.all([
        db`UPDATE outputs       SET owner_user_id = ${ownerUserId}::uuid WHERE task_id = ${body.entityId}`,
        db`UPDATE conversations SET owner_user_id = ${ownerUserId}::uuid WHERE task_id = ${body.entityId}`,
      ])
    } else if (body.entityType === 'output') {
      await db`UPDATE outputs SET owner_user_id = ${ownerUserId}::uuid WHERE id = ${body.entityId}`
    } else if (body.entityType === 'conversation') {
      await db`UPDATE conversations SET owner_user_id = ${ownerUserId}::uuid WHERE id = ${body.entityId}`
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to assign ownership:', error)
    return NextResponse.json({ error: 'Failed to assign ownership' }, { status: 500 })
  }
}
