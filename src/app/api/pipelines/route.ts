import { NextRequest, NextResponse } from 'next/server'

import pipelinesConfig from '@/config/pipelines/pipelines.json'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { resolveAuthContextFromToken } from '@/lib/supabase/auth'

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim()
}

async function getAgencyId() {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null
  const { data, error } = await supabase.from('agencies').select('id').eq('slug', 'default-agency').single()
  if (error) throw error
  return data.id as string
}

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = getSupabaseServerClient()
    const agencyId = await getAgencyId()
    if (!supabase || !agencyId) return NextResponse.json(pipelinesConfig.pipelines || [])

    const { data, error } = await supabase
      .from('pipelines')
      .select('*')
      .eq('agency_id', agencyId)
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json((data || []).map((row: any) => row.definition || {}))
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
    const supabase = getSupabaseServerClient()
    const agencyId = await getAgencyId()
    if (!supabase || !agencyId) return NextResponse.json({ error: 'Supabase not available' }, { status: 503 })

    const payload = {
      id: pipeline.id,
      agency_id: agencyId,
      name: pipeline.name,
      description: pipeline.description || '',
      version: pipeline.version || '1.0',
      is_default: Boolean(pipeline.isDefault),
      estimated_duration: pipeline.estimatedDuration || null,
      definition: pipeline,
      source: 'app',
    }

    const { error } = await supabase.from('pipelines').upsert(payload, { onConflict: 'id' })
    if (error) throw error
    return NextResponse.json({ success: true, pipeline })
  } catch (error) {
    console.error('Failed to save pipeline:', error)
    return NextResponse.json({ error: 'Failed to save pipeline' }, { status: 500 })
  }
}
