import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { NextRequest, NextResponse } from 'next/server'

import { parseSkillZip } from '@/lib/skill-packages'
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

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth || auth.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No ZIP file uploaded.' }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith('.zip')) {
      return NextResponse.json({ error: 'Only .zip skill packages are supported.' }, { status: 400 })
    }

    const parsed = await parseSkillZip(Buffer.from(await file.arrayBuffer()))
    const packageDir = path.join(process.cwd(), 'data', 'skill-packages', parsed.skill.id)
    await mkdir(packageDir, { recursive: true })

    for (const bundleFile of parsed.files) {
      const outputPath = path.join(packageDir, bundleFile.relativePath)
      await mkdir(path.dirname(outputPath), { recursive: true })
      if (typeof bundleFile.textContent === 'string') {
        await writeFile(outputPath, bundleFile.textContent, 'utf8')
      } else if (bundleFile.binaryContent) {
        await writeFile(outputPath, bundleFile.binaryContent)
      } else {
        await writeFile(outputPath, '')
      }
    }

    parsed.skill.metadata = {
      ...parsed.skill.metadata,
      bundle: {
        ...(parsed.skill.metadata.bundle || {}),
        type: 'zip-package',
        entry: parsed.skill.metadata.bundle?.entry || 'SKILL.md',
        files: parsed.files.map((bundleFile) => ({
          relativePath: bundleFile.relativePath,
          role: bundleFile.role,
          size: bundleFile.size,
        })),
        packageDir: `data/skill-packages/${parsed.skill.id}`,
      } as any,
    }

    const supabase = getSupabaseServerClient()
    const agencyId = await getAgencyId()
    if (!supabase || !agencyId) {
      return NextResponse.json({ error: 'Supabase not available' }, { status: 503 })
    }

    const payload = {
      id: parsed.skill.id,
      agency_id: agencyId,
      name: parsed.skill.name,
      category: parsed.skill.category,
      description: parsed.skill.description || '',
      prompts: parsed.skill.prompts,
      checklist: parsed.skill.checklist || [],
      examples: parsed.skill.examples || [],
      metadata: {
        ...(parsed.skill.metadata || {}),
        difficulty: parsed.skill.difficulty || 'intermediate',
        freedom: parsed.skill.freedom || 'medium',
        variables: parsed.skill.variables || [],
        inputs: parsed.skill.inputs || [],
        outputs: parsed.skill.outputs || [],
        workflow: parsed.skill.workflow || { steps: [] },
        tools: parsed.skill.tools || [],
        agents: parsed.skill.agents || [],
        pipelines: parsed.skill.pipelines || [],
      },
      source: 'app',
    }

    const { error } = await supabase.from('skills').upsert(payload, { onConflict: 'id' })
    if (error) throw error

    return NextResponse.json({
      success: true,
      skill: parsed.skill,
      message: `Imported ${parsed.skill.name}`,
    })
  } catch (error: any) {
    const message = error?.message || 'Failed to import skill package.'
    console.error('Failed to import skill package:', error)
    const status = /SKILL\.md file not found/i.test(message) ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
