import { NextRequest, NextResponse } from 'next/server'

import { getSupabaseServerClient } from '@/lib/supabase/server'
import { resolveAuthContextFromToken } from '@/lib/supabase/auth'
import { loadConfigSkillMap } from '@/lib/server/skills-catalog'

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

function mapSkill(row: any) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    category: row.category,
    difficulty: row.metadata?.difficulty || 'intermediate',
    freedom: row.metadata?.freedom || 'medium',
    prompts: row.prompts || {
      en: {
        trigger: '',
        context: '',
        instructions: '',
        output_template: '',
      },
    },
    variables: row.metadata?.variables || [],
    inputs: row.metadata?.inputs || [],
    outputs: row.metadata?.outputs || [],
    workflow: row.metadata?.workflow || { steps: [] },
    tools: row.metadata?.tools || [],
    agents: row.metadata?.agents || [],
    pipelines: row.metadata?.pipelines || [],
    checklist: Array.isArray(row.checklist) ? row.checklist : [],
    examples: Array.isArray(row.examples) ? row.examples : [],
    metadata: row.metadata || {},
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const supabase = getSupabaseServerClient()
    const agencyId = await getAgencyId()
    const configSkillMap = await loadConfigSkillMap()

    if (!supabase || !agencyId) {
      const fallback = configSkillMap.get(id)
      return fallback
        ? NextResponse.json(fallback)
        : NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    }

    const { data, error } = await supabase.from('skills').select('*').eq('agency_id', agencyId).eq('id', id).maybeSingle()
    if (error) throw error
    if (!data) {
      const fallback = configSkillMap.get(id)
      return fallback
        ? NextResponse.json(fallback)
        : NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    }

    const fallback = configSkillMap.get(id)
    const mapped = mapSkill(data)
    return NextResponse.json({
      ...mapped,
      prompts: mapped.prompts?.en?.instructions ? mapped.prompts : fallback?.prompts || mapped.prompts,
      variables: mapped.variables?.length ? mapped.variables : fallback?.variables || [],
      inputs: mapped.inputs?.length ? mapped.inputs : fallback?.inputs || [],
      outputs: mapped.outputs?.length ? mapped.outputs : fallback?.outputs || [],
      workflow: mapped.workflow?.steps?.length ? mapped.workflow : fallback?.workflow || mapped.workflow,
      tools: mapped.tools?.length ? mapped.tools : fallback?.tools || [],
      agents: mapped.agents?.length ? mapped.agents : fallback?.agents || [],
      pipelines: mapped.pipelines?.length ? mapped.pipelines : fallback?.pipelines || [],
      checklist: mapped.checklist?.length ? mapped.checklist : fallback?.checklist || [],
      examples: mapped.examples?.length ? mapped.examples : fallback?.examples || [],
      metadata: {
        ...(fallback?.metadata || {}),
        ...(mapped.metadata || {}),
      },
    })
  } catch (error) {
    console.error('Failed to load skill:', error)
    return NextResponse.json({ error: 'Failed to load skill' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth || auth.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const skill = await request.json()
    const supabase = getSupabaseServerClient()
    const agencyId = await getAgencyId()
    if (!supabase || !agencyId) return NextResponse.json({ error: 'Supabase not available' }, { status: 503 })

    const payload = {
      id,
      agency_id: agencyId,
      name: skill.name,
      category: skill.category,
      description: skill.description || '',
      prompts: skill.prompts || { en: '' },
      checklist: skill.checklist || [],
      examples: skill.examples || [],
      metadata: {
        ...(skill.metadata || {}),
        difficulty: skill.difficulty || 'intermediate',
        freedom: skill.freedom || 'medium',
        variables: skill.variables || [],
        inputs: skill.inputs || [],
        outputs: skill.outputs || [],
        workflow: skill.workflow || { steps: [] },
        tools: skill.tools || [],
        agents: skill.agents || [],
        pipelines: skill.pipelines || [],
      },
      source: 'app',
    }

    const { error } = await supabase.from('skills').upsert(payload, { onConflict: 'id' })
    if (error) throw error
    return NextResponse.json({ success: true, skill })
  } catch (error) {
    console.error('Failed to save skill:', error)
    return NextResponse.json({ error: 'Failed to save skill' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth || auth.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const supabase = getSupabaseServerClient()
    const agencyId = await getAgencyId()
    if (!supabase || !agencyId) return NextResponse.json({ error: 'Supabase not available' }, { status: 503 })

    const { error } = await supabase.from('skills').delete().eq('agency_id', agencyId).eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete skill:', error)
    return NextResponse.json({ error: 'Failed to delete skill' }, { status: 500 })
  }
}
