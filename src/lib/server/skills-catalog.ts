/**
 * Server-side skill catalog. This module is a thin compatibility shim around
 * the canonical registry at `@/lib/skills/registry`.
 *
 * Historical callers (chat route, autonomous-task, task-execution, /api/skills)
 * import:
 *   - loadConfigSkillCategories
 *   - loadConfigSkillMap
 *   - mergeDbSkillsWithConfig
 *
 * They keep working, but everything now reads from `data/skills/<id>/`.
 *
 * If a Supabase row exists for a skill id, that row's name/description/prompts/
 * checklist/examples override the on-disk skill. The on-disk skill always
 * provides the structural fallback so a thin DB row never strips out the
 * agent's full instructions.
 */

import {
  invalidateSkillRegistry,
  loadSkill,
  loadSkillCategories,
  loadSkillMap,
  loadSkillsByIds,
  loadSkillsForAgent,
  renderSkillForPrompt,
  renderSkillsForPrompt,
  type SkillCategory,
} from '@/lib/skills/registry'
import type { Skill, SkillExample, SkillVariable } from '@/lib/skill-schema'

export type EnrichedSkillDefinition = Skill & { inputs: any[]; outputs: any[]; workflow: { steps: any[] } }
export type EnrichedSkillCategory = SkillCategory

export {
  loadSkillCategories as loadConfigSkillCategories,
  loadSkillMap as loadConfigSkillMap,
  loadSkill as loadCanonicalSkill,
  loadSkillsByIds,
  loadSkillsForAgent,
  invalidateSkillRegistry,
  renderSkillForPrompt,
  renderSkillsForPrompt,
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function dbRowToSkill(row: any, base: Skill | undefined): Skill {
  const promptsEn = row.prompts?.en && typeof row.prompts.en === 'object' ? row.prompts.en : null
  const id = row.id
  const fallbackPrompts = base?.prompts.en || { trigger: '', context: '', instructions: '', output_template: '' }

  const skill: Skill = {
    id,
    name: row.name || base?.name || id,
    description: row.description || base?.description || '',
    category: row.category || base?.category || 'operations',
    difficulty: (row.metadata?.difficulty as Skill['difficulty']) || base?.difficulty || 'intermediate',
    freedom: (row.metadata?.freedom as Skill['freedom']) || base?.freedom || 'medium',
    prompts: {
      en: {
        trigger: promptsEn?.trigger || fallbackPrompts.trigger,
        context: promptsEn?.context || fallbackPrompts.context,
        instructions: promptsEn?.instructions || fallbackPrompts.instructions,
        output_template: promptsEn?.output_template || fallbackPrompts.output_template,
      },
    },
    variables: (row.metadata?.variables as SkillVariable[]) || base?.variables || [],
    inputs: row.metadata?.inputs || base?.inputs || [],
    outputs: row.metadata?.outputs || base?.outputs || [],
    workflow: row.metadata?.workflow || base?.workflow,
    examples: (row.examples as SkillExample[]) || base?.examples || [],
    checklist: Array.isArray(row.checklist) && row.checklist.length ? row.checklist : base?.checklist || [],
    tools: row.metadata?.tools || base?.tools || [],
    agents: row.metadata?.agents || base?.agents || [],
    pipelines: row.metadata?.pipelines || base?.pipelines || [],
    metadata: {
      ...(base?.metadata || { version: '1.0', author: 'mission-control', tags: [], lastUpdated: '' }),
      ...(row.metadata || {}),
    },
  }

  return skill
}

/**
 * Merge Supabase-backed skill rows with the canonical filesystem registry.
 *
 * - Every canonical skill on disk is included by default.
 * - DB rows override metadata/prompts/checklist for matching ids.
 * - DB-only skills (rows with no on-disk folder) are added as new entries.
 */
export async function mergeDbSkillsWithConfig(rows: any[] | null | undefined): Promise<SkillCategory[]> {
  const canonicalById = await loadSkillMap()
  const merged = new Map<string, Skill>(canonicalById)

  for (const row of asArray<any>(rows)) {
    if (!row?.id) continue
    const base = merged.get(row.id)
    merged.set(row.id, dbRowToSkill(row, base))
  }

  const grouped = new Map<string, SkillCategory>()
  for (const skill of merged.values()) {
    const id = skill.category || 'operations'
    if (!grouped.has(id)) {
      grouped.set(id, { id, name: id, skills: [] })
    }
    grouped.get(id)!.skills.push(skill)
  }

  return Array.from(grouped.values())
    .map((category) => ({
      ...category,
      skills: category.skills.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .filter((category) => category.skills.length > 0)
}
