/**
 * Mission Control Skill Registry — single source of truth.
 *
 * Filesystem layout (canonical, Claude-skills compatible):
 *
 *   data/skills/<skill-id>/
 *     SKILL.md           (REQUIRED) — Claude-format skill file:
 *                                       YAML frontmatter (id, name, description,
 *                                       category, agents, pipelines, tools, …)
 *                                       followed by the agent-facing instructions
 *                                       in markdown body.
 *     skill.json         (optional) — Sidecar for richer structured data that
 *                                     doesn't fit cleanly in YAML (variables,
 *                                     inputs/outputs, workflow steps with verify
 *                                     clauses, examples, version metadata).
 *     INSTRUCTIONS.md    (optional) — Long-form instructions (overrides body).
 *     CONTEXT.md         (optional) — Agent persona / context block.
 *     TRIGGER.md         (optional) — When to use this skill.
 *     OUTPUT_TEMPLATE.md (optional) — Expected output structure.
 *     CHECKLIST.md       (optional) — Verification checklist (one bullet per line).
 *     WORKFLOW.md        (optional) — Workflow steps (heading or numbered list).
 *     EXAMPLES.md        (optional) — Labelled input/output examples.
 *     references/        (optional) — Extra reference files (loaded on demand).
 *     scripts/           (optional) — Helper scripts (loaded on demand).
 *
 * Precedence rules:
 *   1. SKILL.md frontmatter is the primary metadata source.
 *   2. skill.json (if present) overrides/extends frontmatter for fields that
 *      don't survive YAML well (e.g. workflow.steps with verify, examples).
 *   3. The dedicated markdown files (INSTRUCTIONS.md, OUTPUT_TEMPLATE.md,
 *      CHECKLIST.md, WORKFLOW.md, EXAMPLES.md, TRIGGER.md, CONTEXT.md) are
 *      treated as authoritative for their respective content block when
 *      present. This lets editors update prose without touching YAML/JSON.
 *   4. If neither SKILL.md nor skill.json exists, the folder is skipped.
 *
 * This module is the ONLY place that should read skills off disk. Server-side
 * loaders (chat route, autonomous-task, task-execution) and client-side
 * loaders (Zustand skills-store) must go through here so the schema, fallback
 * behaviour, and cache stay consistent.
 */

import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'

import type {
  Skill,
  SkillExample,
  SkillIOField,
  SkillVariable,
  SkillWorkflowStep,
} from '@/lib/skill-schema'

export const SKILL_CATEGORY_LABELS: Record<string, string> = {
  strategy: 'Strategy & Planning',
  creative: 'Creative & Copy',
  media: 'Media & Advertising',
  research: 'Research & Analytics',
  operations: 'Operations & Workflow',
  'client-services': 'Client Services',
  content: 'Content Production',
}

export interface SkillCategory {
  id: string
  name: string
  skills: Skill[]
}

export interface SkillRegistryStats {
  totalSkills: number
  totalCategories: number
  loadedFromFolders: number
  loadedFromLegacyConfig: number
}

interface RegistryCacheEntry {
  loadedAt: number
  byId: Map<string, Skill>
  categories: SkillCategory[]
  stats: SkillRegistryStats
}

const CACHE_TTL_MS = 60_000
let cache: RegistryCacheEntry | null = null

const SKILLS_DIR = path.join(process.cwd(), 'data', 'skills')

function fallbackCategoryName(id: string) {
  return SKILL_CATEGORY_LABELS[id] || id.charAt(0).toUpperCase() + id.slice(1)
}

async function tryReadFile(filePath: string): Promise<string | null> {
  try {
    const raw = await readFile(filePath, 'utf8')
    return raw.trim().length ? raw : null
  } catch {
    return null
  }
}

async function isDirectory(filePath: string) {
  try {
    return (await stat(filePath)).isDirectory()
  } catch {
    return false
  }
}

function parseChecklist(markdown: string): string[] {
  const lines = markdown.split('\n')
  const items: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const match = trimmed.match(/^(?:[-*+]|\d+[.)])\s+(.*)$/)
    if (match) {
      const text = match[1].trim()
      if (text) items.push(text)
    } else if (!trimmed.startsWith('#')) {
      items.push(trimmed)
    }
  }
  return items
}

function parseWorkflowMarkdown(markdown: string): SkillWorkflowStep[] {
  const lines = markdown.split('\n')
  const steps: SkillWorkflowStep[] = []
  let current: Partial<SkillWorkflowStep> | null = null
  let stepIndex = 0

  const flush = () => {
    if (current && (current.name || current.action)) {
      stepIndex += 1
      steps.push({
        step: stepIndex,
        name: current.name || `Step ${stepIndex}`,
        action: current.action || '',
        verify: current.verify || '',
      })
    }
    current = null
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue
    const heading = line.match(/^(?:##+\s+|\d+[.)]\s+)(.+)/)
    if (heading) {
      flush()
      current = { name: heading[1].trim(), action: '', verify: '' }
      continue
    }
    if (!current) {
      current = { name: line, action: '', verify: '' }
      continue
    }
    const verify = line.match(/^(?:[-*+]\s+)?verify[:\-]\s*(.+)/i)
    if (verify) {
      current.verify = verify[1].trim()
      continue
    }
    const action = line.match(/^(?:[-*+]\s+)?(?:action|do)[:\-]\s*(.+)/i)
    if (action) {
      current.action = action[1].trim()
      continue
    }
    current.action = current.action ? `${current.action} ${line}`.trim() : line
  }
  flush()
  return steps
}

function parseExamples(markdown: string): SkillExample[] {
  // Sections separated by `## Example` (or numbered) with `Input:` / `Output:` blocks.
  const blocks = markdown.split(/^##\s+Example.*$/im).map((block) => block.trim()).filter(Boolean)
  const examples: SkillExample[] = []
  for (const block of blocks) {
    const inputMatch = block.match(/(?:^|\n)Input:\s*([\s\S]*?)(?=\nOutput:|\n##|$)/i)
    const outputMatch = block.match(/(?:^|\n)Output:\s*([\s\S]*?)(?=\n##|$)/i)
    const input = inputMatch?.[1]?.trim() || ''
    const output = outputMatch?.[1]?.trim() || ''
    if (input || output) {
      examples.push({ input, output })
    }
  }
  return examples
}

function normalizeArrayOfStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
}

function asWorkflowSteps(value: unknown): SkillWorkflowStep[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') return null
      const item = entry as Partial<SkillWorkflowStep>
      const name = typeof item.name === 'string' ? item.name : ''
      const action = typeof item.action === 'string' ? item.action : ''
      const verify = typeof item.verify === 'string' ? item.verify : ''
      const step = typeof item.step === 'number' ? item.step : index + 1
      if (!name && !action) return null
      return { step, name: name || `Step ${step}`, action, verify }
    })
    .filter(Boolean) as SkillWorkflowStep[]
}

function asVariables(value: unknown): SkillVariable[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const item = entry as Partial<SkillVariable>
      if (!item.name || typeof item.name !== 'string') return null
      const type = (item.type || 'string') as SkillVariable['type']
      return {
        name: item.name,
        type,
        required: Boolean(item.required),
        description: typeof item.description === 'string' ? item.description : '',
        default: typeof item.default === 'string' ? item.default : undefined,
        options: Array.isArray(item.options) ? (item.options as string[]) : undefined,
      }
    })
    .filter(Boolean) as SkillVariable[]
}

function asIoFields(value: unknown): SkillIOField[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const item = entry as Partial<SkillIOField>
      if (!item.name || typeof item.name !== 'string') return null
      return {
        name: item.name,
        type: typeof item.type === 'string' ? item.type : 'string',
        required: Boolean(item.required),
        description: typeof item.description === 'string' ? item.description : '',
      }
    })
    .filter(Boolean) as SkillIOField[]
}

function asExamples(value: unknown): SkillExample[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const item = entry as Partial<SkillExample>
      const input = typeof item.input === 'string' ? item.input : ''
      const output = typeof item.output === 'string' ? item.output : ''
      if (!input && !output) return null
      return { input, output }
    })
    .filter(Boolean) as SkillExample[]
}

interface SkillFolderSources {
  json: any
  trigger?: string
  context?: string
  instructions?: string
  outputTemplate?: string
  checklist?: string[]
  workflow?: SkillWorkflowStep[]
  examples?: SkillExample[]
  skillMdBody?: string
}

interface SkillMdSplit {
  frontmatter: Record<string, unknown>
  body: string
}

/**
 * Parse a `SKILL.md` file consisting of YAML-style frontmatter delimited by
 * `---` and a markdown body. Returns null if the file is missing or doesn't
 * contain frontmatter at all.
 */
function parseSkillMd(raw: string): SkillMdSplit | null {
  const trimmed = raw.replace(/^﻿/, '')
  if (!trimmed.startsWith('---')) {
    // No frontmatter — treat whole file as body so the loader can still
    // capture instructions, but caller decides how to handle missing metadata.
    return { frontmatter: {}, body: trimmed.trim() }
  }
  const end = trimmed.indexOf('\n---', 3)
  if (end < 0) return null
  const frontmatterRaw = trimmed.slice(3, end).trim()
  const body = trimmed.slice(end + 4).replace(/^\n+/, '').trim()
  const frontmatter = parseFrontmatter(frontmatterRaw)
  return { frontmatter, body }
}

/**
 * Minimal YAML-frontmatter parser. Supports:
 *   key: scalar
 *   key: "quoted scalar"
 *   key: [item, item]
 *   key:
 *     - item
 *     - item
 *   key:
 *     subkey: value
 *
 * Anything fancier should live in the optional skill.json sidecar.
 */
function parseFrontmatter(text: string): Record<string, unknown> {
  const lines = text.split('\n')
  const root: Record<string, unknown> = {}
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      i += 1
      continue
    }
    const colon = trimmed.indexOf(':')
    if (colon < 0) {
      i += 1
      continue
    }
    const key = trimmed.slice(0, colon).trim()
    const remainder = trimmed.slice(colon + 1).trim()

    if (remainder === '') {
      // Block-scalar: collect indented children
      const childLines: string[] = []
      i += 1
      while (i < lines.length) {
        const next = lines[i]
        if (!next.trim()) {
          childLines.push('')
          i += 1
          continue
        }
        const indent = next.length - next.trimStart().length
        if (indent === 0) break
        childLines.push(next.slice(2)) // assume 2-space indent
        i += 1
      }
      root[key] = parseBlockChildren(childLines)
      continue
    }

    if (remainder.startsWith('[') && remainder.endsWith(']')) {
      root[key] = remainder
        .slice(1, -1)
        .split(',')
        .map((item) => stripQuotes(item.trim()))
        .filter(Boolean)
      i += 1
      continue
    }

    root[key] = coerceScalar(remainder)
    i += 1
  }
  return root
}

function parseBlockChildren(childLines: string[]): unknown {
  const trimmed = childLines.map((line) => line.trimEnd())
  if (!trimmed.length) return ''

  const looksLikeList = trimmed.every((line) => !line.trim() || line.trim().startsWith('-'))
  if (looksLikeList) {
    return trimmed
      .filter((line) => line.trim().startsWith('-'))
      .map((line) => stripQuotes(line.trim().replace(/^-\s*/, '')))
  }

  // Nested object
  const obj: Record<string, unknown> = {}
  for (const line of trimmed) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const colon = t.indexOf(':')
    if (colon < 0) continue
    const key = t.slice(0, colon).trim()
    const value = t.slice(colon + 1).trim()
    obj[key] = coerceScalar(value)
  }
  return obj
}

function stripQuotes(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1)
  }
  return value
}

function coerceScalar(value: string): unknown {
  const stripped = stripQuotes(value)
  if (stripped === 'true') return true
  if (stripped === 'false') return false
  if (stripped === 'null' || stripped === '~' || stripped === '') return ''
  if (/^-?\d+(\.\d+)?$/.test(stripped)) return Number(stripped)
  return stripped
}

function asStringArray(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

/**
 * Merge a SKILL.md frontmatter object into the JSON-shaped metadata expected
 * by the rest of the registry. Non-conflicting JSON values override
 * frontmatter values (so the optional sidecar wins for advanced fields), and
 * frontmatter wins for fields the sidecar doesn't define.
 */
function mergeFrontmatterIntoJson(frontmatter: Record<string, unknown>, json: any) {
  const merged: any = { ...(json || {}) }

  const stringFields = ['id', 'name', 'description', 'category', 'difficulty', 'freedom', 'version', 'author']
  for (const field of stringFields) {
    if (merged[field] === undefined && frontmatter[field] !== undefined) {
      merged[field] = frontmatter[field]
    }
  }

  if (merged.tools === undefined) merged.tools = asStringArray(frontmatter['tools'] ?? frontmatter['allowed-tools'])
  if (merged.agents === undefined) merged.agents = asStringArray(frontmatter['agents'])
  if (merged.pipelines === undefined) merged.pipelines = asStringArray(frontmatter['pipelines'])

  const tags = asStringArray(frontmatter['tags'])
  if (tags.length || frontmatter['author'] || frontmatter['version']) {
    merged.metadata = {
      ...(merged.metadata || {}),
      ...(tags.length && !merged.metadata?.tags?.length ? { tags } : {}),
      ...(frontmatter['author'] && !merged.metadata?.author ? { author: String(frontmatter['author']) } : {}),
      ...(frontmatter['version'] && !merged.metadata?.version ? { version: String(frontmatter['version']) } : {}),
    }
  }

  return merged
}

/**
 * From a SKILL.md body, try to extract section blocks by H2 headings so we
 * can populate trigger/instructions/output_template/checklist/workflow/examples
 * when those dedicated *.md files are not present.
 */
function extractSectionsFromBody(body: string): {
  trigger?: string
  context?: string
  instructions?: string
  outputTemplate?: string
  checklist?: string[]
  workflow?: SkillWorkflowStep[]
  examples?: SkillExample[]
} {
  if (!body) return {}

  const sections: Record<string, string> = {}
  const headingRegex = /^##\s+(.+?)\s*$/gm
  const matches: Array<{ name: string; index: number; end: number }> = []

  let match: RegExpExecArray | null
  while ((match = headingRegex.exec(body)) !== null) {
    matches.push({ name: match[1].toLowerCase().trim(), index: match.index + match[0].length, end: 0 })
  }
  for (let i = 0; i < matches.length; i += 1) {
    matches[i].end = i + 1 < matches.length ? matches[i + 1].index - matches[i + 1].name.length - 4 : body.length
    sections[matches[i].name] = body.slice(matches[i].index, matches[i].end).trim()
  }

  const aliases: Record<string, string[]> = {
    trigger: ['trigger', 'when to use', 'use when'],
    context: ['context', 'persona', 'agent context'],
    instructions: ['instructions', 'workflow', 'how it works', 'method', 'procedure'],
    outputTemplate: ['output template', 'output format', 'output structure', 'expected output'],
    checklist: ['checklist', 'quality checklist', 'verification checklist'],
    examples: ['examples', 'example'],
  }

  const find = (keys: string[]) => {
    for (const key of keys) {
      if (sections[key]) return sections[key]
    }
    return undefined
  }

  const out: ReturnType<typeof extractSectionsFromBody> = {}
  out.trigger = find(aliases.trigger)
  out.context = find(aliases.context)
  out.instructions = find(aliases.instructions)
  out.outputTemplate = find(aliases.outputTemplate)
  const checklistMd = find(aliases.checklist)
  if (checklistMd) out.checklist = parseChecklist(checklistMd)
  if (sections['workflow']) out.workflow = parseWorkflowMarkdown(sections['workflow'])
  const examplesMd = find(aliases.examples)
  if (examplesMd) out.examples = parseExamples(examplesMd)

  // If no instructions section was identified but there is body content, treat
  // the whole body as instructions so the agent at least sees the prose.
  if (!out.instructions && Object.keys(sections).length === 0) {
    out.instructions = body.trim()
  }

  return out
}

async function readSkillFolder(folderPath: string, id: string): Promise<SkillFolderSources | null> {
  const [
    skillMdRaw,
    jsonRaw,
    triggerMd,
    contextMd,
    instructionsMd,
    outputTemplateMd,
    checklistMd,
    workflowMd,
    examplesMd,
  ] = await Promise.all([
    tryReadFile(path.join(folderPath, 'SKILL.md')),
    tryReadFile(path.join(folderPath, 'skill.json')),
    tryReadFile(path.join(folderPath, 'TRIGGER.md')),
    tryReadFile(path.join(folderPath, 'CONTEXT.md')),
    tryReadFile(path.join(folderPath, 'INSTRUCTIONS.md')),
    tryReadFile(path.join(folderPath, 'OUTPUT_TEMPLATE.md')),
    tryReadFile(path.join(folderPath, 'CHECKLIST.md')),
    tryReadFile(path.join(folderPath, 'WORKFLOW.md')),
    tryReadFile(path.join(folderPath, 'EXAMPLES.md')),
  ])

  // Need at least one of SKILL.md or skill.json to consider this a real skill.
  if (!skillMdRaw && !jsonRaw) return null

  let json: any = {}
  if (jsonRaw) {
    try {
      json = JSON.parse(jsonRaw)
    } catch (err) {
      throw new Error(`Failed to parse ${path.join(folderPath, 'skill.json')}: ${(err as Error).message}`)
    }
  }

  let bodySections: ReturnType<typeof extractSectionsFromBody> = {}
  if (skillMdRaw) {
    const split = parseSkillMd(skillMdRaw)
    if (split) {
      json = mergeFrontmatterIntoJson(split.frontmatter, json)
      bodySections = extractSectionsFromBody(split.body)
    }
  }

  json.id = json.id || id

  return {
    json,
    trigger: triggerMd?.trim() || bodySections.trigger || undefined,
    context: contextMd?.trim() || bodySections.context || undefined,
    instructions: instructionsMd?.trim() || bodySections.instructions || undefined,
    outputTemplate: outputTemplateMd?.trim() || bodySections.outputTemplate || undefined,
    checklist: checklistMd ? parseChecklist(checklistMd) : bodySections.checklist,
    workflow: workflowMd ? parseWorkflowMarkdown(workflowMd) : bodySections.workflow,
    examples: examplesMd ? parseExamples(examplesMd) : bodySections.examples,
    skillMdBody: skillMdRaw || undefined,
  }
}

function buildSkillFromSources(sources: SkillFolderSources): Skill {
  const json = sources.json || {}
  const promptsEn = json.prompts?.en || {}

  const trigger = sources.trigger || promptsEn.trigger || ''
  const context = sources.context || promptsEn.context || ''
  const instructions = sources.instructions || promptsEn.instructions || ''
  const outputTemplate = sources.outputTemplate || promptsEn.output_template || ''

  const checklistFromMd = sources.checklist
  const checklist = checklistFromMd && checklistFromMd.length ? checklistFromMd : normalizeArrayOfStrings(json.checklist)
  const workflowFromMd = sources.workflow
  const workflowSteps =
    workflowFromMd && workflowFromMd.length
      ? workflowFromMd
      : asWorkflowSteps(json.workflow?.steps)
  const examplesFromMd = sources.examples
  const examples = examplesFromMd && examplesFromMd.length ? examplesFromMd : asExamples(json.examples)

  const skill: Skill = {
    $schema: typeof json.$schema === 'string' ? json.$schema : undefined,
    id: String(json.id),
    name: typeof json.name === 'string' ? json.name : json.id,
    description: typeof json.description === 'string' ? json.description : '',
    category: typeof json.category === 'string' ? json.category : 'operations',
    difficulty: (json.difficulty as Skill['difficulty']) || 'intermediate',
    freedom: (json.freedom as Skill['freedom']) || 'medium',
    prompts: {
      en: {
        trigger,
        context,
        instructions,
        output_template: outputTemplate,
      },
    },
    variables: asVariables(json.variables),
    inputs: asIoFields(json.inputs),
    outputs: asIoFields(json.outputs),
    workflow: workflowSteps.length ? { steps: workflowSteps } : undefined,
    examples,
    checklist,
    tools: normalizeArrayOfStrings(json.tools),
    agents: normalizeArrayOfStrings(json.agents),
    pipelines: normalizeArrayOfStrings(json.pipelines),
    metadata: {
      version: typeof json.metadata?.version === 'string' ? json.metadata.version : '1.0',
      author: typeof json.metadata?.author === 'string' ? json.metadata.author : 'mission-control',
      tags: normalizeArrayOfStrings(json.metadata?.tags),
      lastUpdated:
        typeof json.metadata?.lastUpdated === 'string'
          ? json.metadata.lastUpdated
          : new Date().toISOString().split('T')[0],
      bundle: json.metadata?.bundle,
    },
  }

  if (json.prompts?.ar) skill.prompts.ar = json.prompts.ar

  return skill
}

async function loadSkillsFromCanonicalFolders(): Promise<{
  byId: Map<string, Skill>
  loaded: number
}> {
  const byId = new Map<string, Skill>()
  let loaded = 0

  let entries: string[] = []
  try {
    entries = await readdir(SKILLS_DIR)
  } catch {
    return { byId, loaded }
  }

  await Promise.all(
    entries.map(async (entry) => {
      if (entry.startsWith('.')) return
      const folderPath = path.join(SKILLS_DIR, entry)
      if (!(await isDirectory(folderPath))) return
      const sources = await readSkillFolder(folderPath, entry)
      if (!sources) return
      const skill = buildSkillFromSources(sources)
      byId.set(skill.id, skill)
      loaded += 1
    })
  )

  return { byId, loaded }
}

// Legacy fallback removed once data/skills/<id>/ became the single canonical
// location. Editors that previously dropped a JSON into src/config/skills/ now
// belong in data/skills/<id>/SKILL.md (with optional skill.json sidecar).

function groupByCategory(byId: Map<string, Skill>): SkillCategory[] {
  const grouped = new Map<string, SkillCategory>()
  for (const skill of byId.values()) {
    const id = skill.category || 'operations'
    if (!grouped.has(id)) {
      grouped.set(id, { id, name: fallbackCategoryName(id), skills: [] })
    }
    grouped.get(id)!.skills.push(skill)
  }
  return Array.from(grouped.values())
    .map((category) => ({
      ...category,
      skills: category.skills.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

async function loadRegistry(): Promise<RegistryCacheEntry> {
  const { byId, loaded: loadedFromFolders } = await loadSkillsFromCanonicalFolders()
  const categories = groupByCategory(byId)

  return {
    loadedAt: Date.now(),
    byId,
    categories,
    stats: {
      totalSkills: byId.size,
      totalCategories: categories.length,
      loadedFromFolders,
      loadedFromLegacyConfig: 0,
    },
  }
}

async function getRegistry(forceReload = false): Promise<RegistryCacheEntry> {
  if (!forceReload && cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) {
    return cache
  }
  cache = await loadRegistry()
  return cache
}

export function invalidateSkillRegistry() {
  cache = null
}

export async function loadSkillCategories(): Promise<SkillCategory[]> {
  const registry = await getRegistry()
  return registry.categories
}

export async function loadSkillMap(): Promise<Map<string, Skill>> {
  const registry = await getRegistry()
  return new Map(registry.byId)
}

export async function loadSkill(id: string): Promise<Skill | null> {
  const registry = await getRegistry()
  return registry.byId.get(id) || null
}

export async function loadSkillsForAgent(agentId: string): Promise<Skill[]> {
  const registry = await getRegistry()
  return Array.from(registry.byId.values()).filter((skill) => skill.agents?.includes(agentId))
}

export async function loadSkillsByIds(ids: string[]): Promise<Skill[]> {
  const registry = await getRegistry()
  const result: Skill[] = []
  for (const id of ids) {
    const skill = registry.byId.get(id)
    if (skill) result.push(skill)
  }
  return result
}

export async function getSkillRegistryStats(): Promise<SkillRegistryStats> {
  const registry = await getRegistry()
  return registry.stats
}

/**
 * Build a compact, prompt-ready string for a single skill. Trim long blocks
 * to a sensible upper bound so 4–5 skills can be packed into a prompt without
 * blowing the context window.
 */
export function renderSkillForPrompt(skill: Skill, options?: { maxInstructionChars?: number; maxTemplateChars?: number }) {
  const maxInstr = options?.maxInstructionChars ?? 1200
  const maxTpl = options?.maxTemplateChars ?? 600
  const truncate = (value: string, max: number) =>
    value.length > max ? `${value.slice(0, max - 3)}...` : value

  const lines: string[] = [`### Skill: ${skill.name}`]
  if (skill.description) lines.push(skill.description)
  if (skill.prompts.en.trigger) lines.push(`Trigger: ${truncate(skill.prompts.en.trigger, 320)}`)
  if (skill.prompts.en.instructions) {
    lines.push('Instructions:')
    lines.push(truncate(skill.prompts.en.instructions, maxInstr))
  }
  if (skill.prompts.en.output_template) {
    lines.push('Output template:')
    lines.push(truncate(skill.prompts.en.output_template, maxTpl))
  }
  if (skill.checklist?.length) {
    lines.push('Quality checklist:')
    for (const item of skill.checklist.slice(0, 6)) lines.push(`- ${item}`)
  }
  if (skill.workflow?.steps?.length) {
    lines.push('Workflow:')
    for (const step of skill.workflow.steps.slice(0, 5)) {
      lines.push(`- ${step.name}${step.action ? ` — ${step.action}` : ''}`)
    }
  }
  return lines.join('\n')
}

export function renderSkillsForPrompt(skills: Skill[], options?: { maxSkills?: number; maxInstructionChars?: number; maxTemplateChars?: number }) {
  const max = options?.maxSkills ?? 4
  return skills
    .slice(0, max)
    .map((skill) =>
      renderSkillForPrompt(skill, {
        maxInstructionChars: options?.maxInstructionChars,
        maxTemplateChars: options?.maxTemplateChars,
      })
    )
    .join('\n\n')
}
