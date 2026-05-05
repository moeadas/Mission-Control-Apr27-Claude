import { NextRequest, NextResponse } from 'next/server'

import { getDb } from '@/lib/db/client'
import { resolveAuthContextFromToken } from '@/lib/auth/server'
import { invalidateSkillRegistry, loadConfigSkillCategories, mergeDbSkillsWithConfig } from '@/lib/server/skills-catalog'

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

async function buildFallbackSkills() {
  const categories = await loadConfigSkillCategories()
  return categories.flatMap((category) => category.skills)
}

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const query = (searchParams.get('q') || '').trim().toLowerCase()
    const categoryFilter = (searchParams.get('category') || '').trim().toLowerCase()

    const agencyId = await getAgencyId()
    if (!agencyId) {
      const fallbackSkills = await buildFallbackSkills()
      const filteredFallback = fallbackSkills.filter((skill: any) => {
        const searchable = [
          skill.id,
          skill.name,
          skill.description,
          skill.category,
          skill.difficulty,
          skill.freedom,
          skill.prompts?.en?.trigger,
          skill.prompts?.en?.context,
          skill.prompts?.en?.instructions,
          ...(skill.tools || []),
          ...(skill.agents || []),
          ...(skill.pipelines || []),
          ...(skill.checklist || []),
          ...((skill.metadata?.tags as string[] | undefined) || []),
        ]
          .join(' ')
          .toLowerCase()
        const matchesQuery = !query || searchable.includes(query)
        const matchesCategory = !categoryFilter || String(skill.category || '').toLowerCase() === categoryFilter
        return matchesQuery && matchesCategory
      })
      return NextResponse.json(filteredFallback)
    }

    const db = getDb()
    const data = await db`
      SELECT * FROM skills
      WHERE agency_id = ${agencyId}
      ORDER BY category ASC, name ASC
    `

    const categories = await mergeDbSkillsWithConfig(data || [])
    const flattened = categories.flatMap((category) => category.skills)
    const filtered = flattened.filter((skill) => {
      const searchable = [
        skill.id,
        skill.name,
        skill.description,
        skill.category,
        skill.difficulty,
        skill.freedom,
        skill.prompts?.en?.trigger,
        skill.prompts?.en?.context,
        skill.prompts?.en?.instructions,
        ...(skill.tools || []),
        ...(skill.agents || []),
        ...(skill.pipelines || []),
        ...(skill.checklist || []),
        ...((skill.metadata?.tags as string[] | undefined) || []),
      ]
        .join(' ')
        .toLowerCase()
      const matchesQuery = !query || searchable.includes(query)
      const matchesCategory = !categoryFilter || String(skill.category || '').toLowerCase() === categoryFilter
      return matchesQuery && matchesCategory
    })
    return NextResponse.json(filtered)
  } catch (error) {
    console.error('Failed to load skills:', error)
    return NextResponse.json({ error: 'Failed to load skills' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth || auth.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const skill = await request.json()
    if (!skill.id || !skill.name) {
      return NextResponse.json({ error: 'Skill id and name are required' }, { status: 400 })
    }

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
        ${skill.id},
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

    // Drop the in-process registry cache so the next chat/task call sees the
    // new skill without waiting up to 60s for the TTL to expire.
    invalidateSkillRegistry()

    return NextResponse.json({ success: true, skill })
  } catch (error) {
    console.error('Failed to save skill:', error)
    return NextResponse.json({ error: 'Failed to save skill' }, { status: 500 })
  }
}
