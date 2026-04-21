import { NextRequest, NextResponse } from 'next/server'

import { getSupabaseServerClient } from '@/lib/supabase/server'
import { resolveAuthContextFromToken } from '@/lib/supabase/auth'

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

    const body = (await request.json()) as {
      entityType?: EntityType
      entityId?: string
      ownerUserId?: string | null
    }

    if (!body.entityType || !body.entityId) {
      return NextResponse.json({ error: 'Missing assignment payload' }, { status: 400 })
    }

    const supabase = getSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not available' }, { status: 503 })
    }

    const ownerUserId = body.ownerUserId || null

    if (body.entityType === 'client') {
      const { error } = await supabase.from('clients').update({ owner_user_id: ownerUserId }).eq('id', body.entityId)
      if (error) throw error
      await Promise.all([
        supabase.from('tasks').update({ owner_user_id: ownerUserId }).eq('client_id', body.entityId),
        supabase.from('outputs').update({ owner_user_id: ownerUserId }).eq('client_id', body.entityId),
        supabase.from('conversations').update({ owner_user_id: ownerUserId }).eq('client_id', body.entityId),
      ])
    } else if (body.entityType === 'task') {
      const { error } = await supabase.from('tasks').update({ owner_user_id: ownerUserId }).eq('id', body.entityId)
      if (error) throw error
      await Promise.all([
        supabase.from('outputs').update({ owner_user_id: ownerUserId }).eq('task_id', body.entityId),
        supabase.from('conversations').update({ owner_user_id: ownerUserId }).eq('task_id', body.entityId),
      ])
    } else if (body.entityType === 'output') {
      const { error } = await supabase.from('outputs').update({ owner_user_id: ownerUserId }).eq('id', body.entityId)
      if (error) throw error
    } else if (body.entityType === 'conversation') {
      const { error } = await supabase.from('conversations').update({ owner_user_id: ownerUserId }).eq('id', body.entityId)
      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to assign ownership:', error)
    return NextResponse.json({ error: 'Failed to assign ownership' }, { status: 500 })
  }
}
