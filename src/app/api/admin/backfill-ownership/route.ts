import { NextRequest, NextResponse } from 'next/server'

import { getSupabaseServerClient } from '@/lib/supabase/server'
import { resolveAuthContextFromToken } from '@/lib/supabase/auth'

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

    const supabase = getSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not available' }, { status: 503 })
    }

    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: auth.userId,
        email: auth.email,
        role: 'super_admin',
        is_active: true,
      },
      { onConflict: 'id' }
    )
    if (profileError) throw profileError

    const updateTable = async (table: 'clients' | 'tasks' | 'outputs' | 'conversations') => {
      const { data, error } = await supabase
        .from(table)
        .update({ owner_user_id: auth.userId })
        .is('owner_user_id', null)
        .select('id')
      if (error) throw error
      return data?.length || 0
    }

    const [clients, tasks, outputs, conversations] = await Promise.all([
      updateTable('clients'),
      updateTable('tasks'),
      updateTable('outputs'),
      updateTable('conversations'),
    ])

    return NextResponse.json({
      success: true,
      counts: { clients, tasks, outputs, conversations },
    })
  } catch (error) {
    console.error('Failed to backfill ownership:', error)
    return NextResponse.json({ error: 'Failed to backfill ownership' }, { status: 500 })
  }
}
