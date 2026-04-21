import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

type ConfigSkillStub = {
  id: string
  name: string
  description?: string
}

type ConfigCategoryStub = {
  id: string
  name: string
  skills?: ConfigSkillStub[]
}

export type EnrichedSkillDefinition = {
  id: string
  name: string
  description: string
  category: string
  difficulty: string
  freedom: string
  prompts: {
    en: {
      trigger: string
      context: string
      instructions: string
      output_template: string
    }
  }
  variables: any[]
  inputs: any[]
  outputs: any[]
  workflow: { steps: any[] }
  tools: string[]
  agents: string[]
  pipelines: string[]
  checklist: string[]
  examples: any[]
  metadata: Record<string, any>
}

export type EnrichedSkillCategory = {
  id: string
  name: string
  skills: EnrichedSkillDefinition[]
}

const CATEGORY_NAMES: Record<string, string> = {
  strategy: 'Strategy & Planning',
  creative: 'Creative & Copy',
  media: 'Media & Advertising',
  research: 'Research & Analytics',
  operations: 'Operations & Workflow',
  'client-services': 'Client Services',
  content: 'Content Production',
}

function buildFallbackSkill(skill: ConfigSkillStub, category: ConfigCategoryStub): EnrichedSkillDefinition {
  return {
    id: skill.id,
    name: skill.name || skill.id,
    description: skill.description || '',
    category: category.id,
    difficulty: 'intermediate',
    freedom: 'medium',
    prompts: {
      en: {
        trigger: '',
        context: '',
        instructions: '',
        output_template: '',
      },
    },
    variables: [],
    inputs: [],
    outputs: [],
    workflow: { steps: [] },
    tools: [],
    agents: [],
    pipelines: [],
    checklist: [],
    examples: [],
    metadata: {
      author: 'Mission Control',
      version: '1.0',
      lastUpdated: new Date().toISOString().split('T')[0],
      difficulty: 'intermediate',
      freedom: 'medium',
    },
  }
}

async function loadConfigSkillDefinition(skill: ConfigSkillStub, category: ConfigCategoryStub): Promise<EnrichedSkillDefinition> {
  try {
    const filePath = path.join(process.cwd(), 'src', 'config', 'skills', `${skill.id}.json`)
    const fullSkill = JSON.parse(await readFile(filePath, 'utf8'))
    return {
      id: fullSkill.id || skill.id,
      name: fullSkill.name || skill.name || skill.id,
      description: fullSkill.description || skill.description || '',
      category: fullSkill.category || category.id,
      difficulty: fullSkill.difficulty || fullSkill.metadata?.difficulty || 'intermediate',
      freedom: fullSkill.freedom || fullSkill.metadata?.freedom || 'medium',
      prompts: fullSkill.prompts || {
        en: {
          trigger: '',
          context: '',
          instructions: '',
          output_template: '',
        },
      },
      variables: fullSkill.variables || [],
      inputs: fullSkill.inputs || [],
      outputs: fullSkill.outputs || [],
      workflow: fullSkill.workflow || { steps: [] },
      tools: fullSkill.tools || [],
      agents: fullSkill.agents || [],
      pipelines: fullSkill.pipelines || [],
      checklist: Array.isArray(fullSkill.checklist) ? fullSkill.checklist : [],
      examples: Array.isArray(fullSkill.examples) ? fullSkill.examples : [],
      metadata: fullSkill.metadata || {},
    }
  } catch {
    return buildFallbackSkill(skill, category)
  }
}

export async function loadConfigSkillCategories(): Promise<EnrichedSkillCategory[]> {
  const skillsDir = path.join(process.cwd(), 'src', 'config', 'skills')
  const files = await readdir(skillsDir)
  const skillFiles = files.filter((file) => file.endsWith('.json') && file !== 'skills-library.json')
  const loadedSkills = await Promise.all(
    skillFiles.map(async (file) => {
      const filePath = path.join(skillsDir, file)
      const fullSkill = JSON.parse(await readFile(filePath, 'utf8'))
      const categoryId = fullSkill.category || 'operations'
      const category: ConfigCategoryStub = {
        id: categoryId,
        name: CATEGORY_NAMES[categoryId] || categoryId,
      }
      const stub: ConfigSkillStub = {
        id: fullSkill.id || file.replace(/\.json$/, ''),
        name: fullSkill.name || file.replace(/\.json$/, ''),
        description: fullSkill.description || '',
      }
      return loadConfigSkillDefinition(stub, category)
    })
  )

  const grouped = new Map<string, EnrichedSkillCategory>()
  for (const skill of loadedSkills) {
    const categoryId = skill.category || 'operations'
    if (!grouped.has(categoryId)) {
      grouped.set(categoryId, {
        id: categoryId,
        name: CATEGORY_NAMES[categoryId] || categoryId,
        skills: [],
      })
    }
    grouped.get(categoryId)?.skills.push(skill)
  }

  return Array.from(grouped.values())
    .map((category) => ({
      ...category,
      skills: category.skills.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function loadConfigSkillMap(): Promise<Map<string, EnrichedSkillDefinition>> {
  const categories = await loadConfigSkillCategories()
  return new Map(categories.flatMap((category) => category.skills.map((skill) => [skill.id, skill] as const)))
}

export async function mergeDbSkillsWithConfig(rows: any[] | null | undefined): Promise<EnrichedSkillCategory[]> {
  const configCategories = await loadConfigSkillCategories()
  const configSkillMap = new Map(configCategories.flatMap((category) => category.skills.map((skill) => [skill.id, skill] as const)))
  const dbRows = Array.isArray(rows) ? rows : []

  const categories = new Map<string, EnrichedSkillCategory>()

  for (const category of configCategories) {
    categories.set(category.id, {
      id: category.id,
      name: category.name,
      skills: [],
    })
  }

  for (const row of dbRows) {
    const configSkill = configSkillMap.get(row.id)
    const categoryId = row.category || configSkill?.category || 'operations'
    if (!categories.has(categoryId)) {
      categories.set(categoryId, {
        id: categoryId,
        name: categoryId,
        skills: [],
      })
    }

    categories.get(categoryId)?.skills.push({
      id: row.id,
      name: row.name || configSkill?.name || row.id,
      description: row.description || configSkill?.description || '',
      category: categoryId,
      difficulty: row.metadata?.difficulty || configSkill?.difficulty || 'intermediate',
      freedom: row.metadata?.freedom || configSkill?.freedom || 'medium',
      prompts: row.prompts || configSkill?.prompts || {
        en: {
          trigger: '',
          context: '',
          instructions: '',
          output_template: '',
        },
      },
      variables: row.metadata?.variables || configSkill?.variables || [],
      inputs: row.metadata?.inputs || configSkill?.inputs || [],
      outputs: row.metadata?.outputs || configSkill?.outputs || [],
      workflow: row.metadata?.workflow || configSkill?.workflow || { steps: [] },
      tools: row.metadata?.tools || configSkill?.tools || [],
      agents: row.metadata?.agents || configSkill?.agents || [],
      pipelines: row.metadata?.pipelines || configSkill?.pipelines || [],
      checklist: Array.isArray(row.checklist) && row.checklist.length ? row.checklist : configSkill?.checklist || [],
      examples: Array.isArray(row.examples) && row.examples.length ? row.examples : configSkill?.examples || [],
      metadata: {
        ...(configSkill?.metadata || {}),
        ...(row.metadata || {}),
      },
    })
  }

  for (const category of configCategories) {
    for (const skill of category.skills) {
      const existingSkills = categories.get(category.id)?.skills || []
      if (!existingSkills.some((entry) => entry.id === skill.id)) {
        categories.get(category.id)?.skills.push(skill)
      }
    }
  }

  return Array.from(categories.values())
    .map((category) => ({
      ...category,
      skills: category.skills.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .filter((category) => category.skills.length > 0)
}
