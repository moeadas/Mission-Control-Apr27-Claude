import { NextRequest, NextResponse } from 'next/server'

import { getDb } from '@/lib/db/client'
import { resolveAuthContextFromToken, getAuthTokenFromRequest } from '@/lib/auth/server'
import { invalidateSkillRegistry, loadConfigSkillMap } from '@/lib/server/skills-catalog'

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
    const agencyId = await getAgencyId()
    const configSkillMap = await loadConfigSkillMap()

    if (!agencyId) {
      const fallback = configSkillMap.get(id)
      return fallback
        ? NextResponse.json(fallback)
        : NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    }

    const db = getDb()
    const rows = await db`
      SELECT * FROM skills WHERE agency_id = ${agencyId} AND id = ${id} LIMIT 1
    `
    if (!rows[0]) {
      const fallback = configSkillMap.get(id)
      return fallback
        ? NextResponse.json(fallback)
        : NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    }

    const fallback = configSkillMap.get(id)
    const mapped = mapSkill(rows[0])
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
    const agencyId = await getAgencyId()
    if (!agencyId) return NextResponse.json({ error: 'Database not available' }, { status: 503 })

    const metadata = JSON.stringify({
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
    })

    const db = getDb()
    await db`
      INSERT INTO skills (id, agency_id, name, category, description, prompts, checklist, examples, metadata, source)
      VALUES (
        ${id},
        ${agencyId},
        ${skill.name},
        ${skill.category || null},
        ${skill.description || ''},
        ${JSON.stringify(skill.prompts || { en: '' })},
        ${JSON.stringify(skill.checklist || [])},
        ${JSON.stringify(skill.examples || [])},
        ${metadata},
        'app'
      )
      ON CONFLICT (id) DO UPDATE SET
        agency_id = EXCLUDED.agency_id,
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        description = EXCLUDED.description,
        prompts = EXCLUDED.prompts,
        checklist = EXCLUDED.checklist,
        examples = EXCLUDED.examples,
        metadata = EXCLUDED.metadata,
        source = EXCLUDED.source
    `
    invalidateSkillRegistry()
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
    const agencyId = await getAgencyId()
    if (!agencyId) return NextResponse.json({ error: 'Database not available' }, { status: 503 })

    const db = getDb()
    await db`DELETE FROM skills WHERE agency_id = ${agencyId} AND id = ${id}`
    invalidateSkillRegistry()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete skill:', error)
    return NextResponse.json({ error: 'Failed to delete skill' }, { status: 500 })
  }
}
