#!/usr/bin/env node
/**
 * One-time upgrade: walk every folder under data/skills/<id>/ that already has
 * a `skill.json` from the previous migration but does NOT yet have a `SKILL.md`,
 * and emit a Claude-format SKILL.md from the legacy source data plus the
 * existing markdown sidecars.
 *
 * Folders that already have a SKILL.md are left alone (preserves the
 * pre-existing nano-banana-pro package, plus anything humans have hand-edited).
 *
 * Run with:
 *   node scripts/upgrade-skills-add-skill-md.js          # dry run
 *   node scripts/upgrade-skills-add-skill-md.js --write  # actually write
 */

const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')
const SKILLS_DIR = path.join(ROOT, 'data', 'skills')
const LEGACY_DIR = path.join(ROOT, 'src', 'config', 'skills')
const WRITE = process.argv.includes('--write')

function escapeYamlScalar(value) {
  if (value === null || value === undefined) return '""'
  const str = String(value)
  if (!str.length) return '""'
  if (/[:\n#"']/.test(str) || /^\s/.test(str) || /\s$/.test(str)) {
    return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  }
  return str
}

function buildYamlFrontmatter(skill) {
  const lines = ['---']
  lines.push(`id: ${escapeYamlScalar(skill.id)}`)
  lines.push(`name: ${escapeYamlScalar(skill.name || skill.id)}`)
  if (skill.description) {
    lines.push(`description: ${escapeYamlScalar(skill.description.replace(/\s+/g, ' ').trim())}`)
  }
  if (skill.category) lines.push(`category: ${escapeYamlScalar(skill.category)}`)
  if (skill.difficulty) lines.push(`difficulty: ${escapeYamlScalar(skill.difficulty)}`)
  if (skill.freedom) lines.push(`freedom: ${escapeYamlScalar(skill.freedom)}`)

  const arrayField = (key, values) => {
    if (Array.isArray(values) && values.length) {
      lines.push(`${key}: [${values.map((value) => escapeYamlScalar(value)).join(', ')}]`)
    }
  }
  arrayField('agents', skill.agents)
  arrayField('pipelines', skill.pipelines)
  arrayField('tools', skill.tools)
  arrayField('tags', skill.metadata?.tags)

  if (skill.metadata?.version) lines.push(`version: ${escapeYamlScalar(skill.metadata.version)}`)
  if (skill.metadata?.author) lines.push(`author: ${escapeYamlScalar(skill.metadata.author)}`)

  lines.push('---', '')
  return lines.join('\n')
}

function buildSkillMd(skill, blocks) {
  const sections = []
  sections.push(`# ${skill.name || skill.id}`)
  if (skill.description) sections.push(skill.description.trim())

  if (blocks.trigger) sections.push('## When to use', blocks.trigger.trim())
  if (blocks.context) sections.push('## Context', blocks.context.trim())
  if (blocks.instructions) sections.push('## Instructions', blocks.instructions.trim())
  if (blocks.outputTemplate) sections.push('## Output template', blocks.outputTemplate.trim())
  if (blocks.checklist?.length) {
    sections.push('## Checklist', blocks.checklist.map((item) => `- ${item}`).join('\n'))
  }
  const steps = Array.isArray(blocks.workflow) ? blocks.workflow : []
  if (steps.length) {
    const lines = steps.map((step, index) => {
      const num = typeof step.step === 'number' ? step.step : index + 1
      const action = step.action ? ` — ${step.action}` : ''
      const verify = step.verify ? ` (verify: ${step.verify})` : ''
      return `${num}. ${step.name || `Step ${num}`}${action}${verify}`
    })
    sections.push('## Workflow', lines.join('\n'))
  }

  return [buildYamlFrontmatter(skill), sections.join('\n\n'), ''].join('\n')
}

function safeReadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

function safeReadFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    return raw.trim() ? raw : null
  } catch {
    return null
  }
}

function stripFirstHeading(markdown) {
  if (!markdown) return markdown
  const lines = markdown.split('\n')
  if (lines[0]?.startsWith('#')) {
    let i = 1
    while (i < lines.length && !lines[i].trim()) i += 1
    return lines.slice(i).join('\n').trim()
  }
  return markdown.trim()
}

function parseChecklistFromMd(markdown) {
  if (!markdown) return []
  return markdown
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[-*+]\s+/.test(line))
    .map((line) => line.replace(/^[-*+]\s+/, '').trim())
    .filter(Boolean)
}

function loadLegacySkill(id) {
  const legacyPath = path.join(LEGACY_DIR, `${id}.json`)
  return safeReadJson(legacyPath)
}

async function upgradeFolder(id) {
  const folder = path.join(SKILLS_DIR, id)
  const skillMdPath = path.join(folder, 'SKILL.md')
  if (fs.existsSync(skillMdPath)) {
    return { id, status: 'already-has-skill-md' }
  }

  const sidecar = safeReadJson(path.join(folder, 'skill.json'))
  const legacy = loadLegacySkill(id)
  const merged = {
    ...(legacy || {}),
    ...(sidecar || {}),
  }
  if (!merged.id) merged.id = id

  // Prefer legacy fields for fields the sidecar collapsed.
  if (!merged.name && legacy?.name) merged.name = legacy.name
  if (!merged.description && legacy?.description) merged.description = legacy.description
  if (!merged.category && legacy?.category) merged.category = legacy.category
  if (!merged.difficulty && legacy?.difficulty) merged.difficulty = legacy.difficulty
  if (!merged.freedom && legacy?.freedom) merged.freedom = legacy.freedom
  if (!merged.agents && legacy?.agents) merged.agents = legacy.agents
  if (!merged.pipelines && legacy?.pipelines) merged.pipelines = legacy.pipelines
  if (!merged.tools && legacy?.tools) merged.tools = legacy.tools
  if (!merged.metadata && legacy?.metadata) merged.metadata = legacy.metadata

  const blocks = {
    trigger: stripFirstHeading(safeReadFile(path.join(folder, 'TRIGGER.md'))) || legacy?.prompts?.en?.trigger || '',
    context: stripFirstHeading(safeReadFile(path.join(folder, 'CONTEXT.md'))) || legacy?.prompts?.en?.context || '',
    instructions:
      stripFirstHeading(safeReadFile(path.join(folder, 'INSTRUCTIONS.md'))) ||
      legacy?.prompts?.en?.instructions ||
      '',
    outputTemplate:
      stripFirstHeading(safeReadFile(path.join(folder, 'OUTPUT_TEMPLATE.md'))) ||
      legacy?.prompts?.en?.output_template ||
      '',
    checklist:
      parseChecklistFromMd(safeReadFile(path.join(folder, 'CHECKLIST.md'))) ||
      legacy?.checklist ||
      [],
    workflow:
      Array.isArray(merged?.workflow?.steps) && merged.workflow.steps.length
        ? merged.workflow.steps
        : Array.isArray(legacy?.workflow?.steps)
          ? legacy.workflow.steps
          : [],
  }

  if (!merged.name) merged.name = id

  const skillMd = buildSkillMd(merged, blocks)

  if (WRITE) {
    await fsp.writeFile(skillMdPath, skillMd, 'utf8')
  }

  return { id, status: 'upgraded' }
}

async function main() {
  if (!fs.existsSync(SKILLS_DIR)) {
    console.error(`No data/skills directory found at ${SKILLS_DIR}`)
    process.exit(1)
  }

  const folders = fs
    .readdirSync(SKILLS_DIR)
    .filter((entry) => !entry.startsWith('.') && fs.statSync(path.join(SKILLS_DIR, entry)).isDirectory())

  console.log(`Found ${folders.length} skill folders in ${SKILLS_DIR}`)
  console.log(`Mode: ${WRITE ? 'WRITE' : 'dry-run (pass --write to actually create files)'}`)
  console.log('')

  const results = await Promise.all(folders.map((id) => upgradeFolder(id)))
  const upgraded = results.filter((r) => r.status === 'upgraded')
  const already = results.filter((r) => r.status === 'already-has-skill-md')

  console.log(`SKILL.md added: ${upgraded.length}`)
  console.log(`Folders already had SKILL.md: ${already.length}`)
  if (already.length) {
    console.log(`  preserved: ${already.map((r) => r.id).slice(0, 8).join(', ')}${already.length > 8 ? ', …' : ''}`)
  }
}

main().catch((err) => {
  console.error('Upgrade failed:', err)
  process.exit(1)
})
