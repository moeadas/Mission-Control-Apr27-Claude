#!/usr/bin/env node
/**
 * Migrate legacy skill JSON files at src/config/skills/<id>.json into the new
 * canonical folder layout at data/skills/<id>/, using SKILL.md (Claude
 * skills format) as the primary file.
 *
 * Each migrated skill becomes:
 *   data/skills/<id>/
 *     SKILL.md             (PRIMARY) — YAML frontmatter + markdown body following
 *                                      Claude skill conventions.
 *     skill.json           (sidecar) — structured fields that don't fit YAML
 *                                      cleanly (variables, inputs/outputs,
 *                                      workflow with verify clauses, examples).
 *     INSTRUCTIONS.md      (optional) — long-form instructions when the body
 *                                       grows large.
 *     CONTEXT.md           (optional) — agent persona / context.
 *     TRIGGER.md           (optional) — when to use this skill.
 *     OUTPUT_TEMPLATE.md   (optional) — output template.
 *     CHECKLIST.md         (optional) — verification checklist.
 *     WORKFLOW.md          (optional) — workflow steps.
 *     EXAMPLES.md          (optional) — input/output examples.
 *
 * Pre-existing folders under data/skills/<id>/ are preserved (we don't clobber
 * the nano-banana-pro package that already lives there). If a folder already
 * exists with a SKILL.md or skill.json, the migration skips it to avoid
 * stomping handcrafted content.
 *
 * Run with:
 *   node scripts/migrate-skills-to-folders.js          # dry run summary
 *   node scripts/migrate-skills-to-folders.js --write  # actually write files
 */

const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')
const LEGACY_DIR = path.join(ROOT, 'src', 'config', 'skills')
const TARGET_DIR = path.join(ROOT, 'data', 'skills')
const WRITE = process.argv.includes('--write')

function listJsonFiles(dir) {
  const entries = fs.readdirSync(dir)
  return entries.filter((entry) => entry.endsWith('.json') && entry !== 'skills-library.json')
}

function checklistToMarkdown(items) {
  if (!Array.isArray(items) || !items.length) return null
  return items.map((item) => `- ${String(item).trim()}`).join('\n') + '\n'
}

function workflowToMarkdown(workflow) {
  const steps = Array.isArray(workflow?.steps) ? workflow.steps : []
  if (!steps.length) return null
  return steps
    .map((step, index) => {
      const num = typeof step.step === 'number' ? step.step : index + 1
      const name = step.name || `Step ${num}`
      const action = step.action ? `\nAction: ${step.action}` : ''
      const verify = step.verify ? `\nVerify: ${step.verify}` : ''
      return `## ${num}. ${name}${action}${verify}`
    })
    .join('\n\n') + '\n'
}

function examplesToMarkdown(examples) {
  if (!Array.isArray(examples) || !examples.length) return null
  return examples
    .map((example, index) => {
      const block = []
      block.push(`## Example ${index + 1}`)
      if (example.input) block.push(`Input:\n${example.input.trim()}`)
      if (example.output) block.push(`Output:\n${example.output.trim()}`)
      return block.join('\n\n')
    })
    .join('\n\n') + '\n'
}

/**
 * Write the optional sidecar JSON for fields YAML can't cleanly carry.
 * We omit anything already represented faithfully in SKILL.md frontmatter.
 */
function buildSidecarJson(skill) {
  const sidecar = {
    $schema: '../../../src/config/schemas/skill.schema.json',
    id: skill.id,
  }
  if (Array.isArray(skill.variables) && skill.variables.length) sidecar.variables = skill.variables
  if (Array.isArray(skill.inputs) && skill.inputs.length) sidecar.inputs = skill.inputs
  if (Array.isArray(skill.outputs) && skill.outputs.length) sidecar.outputs = skill.outputs
  // Workflow goes through SKILL.md body when steps are simple; if any step has
  // a verify clause we keep the structured form here so it round-trips losslessly.
  const steps = Array.isArray(skill.workflow?.steps) ? skill.workflow.steps : []
  const hasVerify = steps.some((step) => step && (step.verify || step.action))
  if (hasVerify) sidecar.workflow = skill.workflow
  if (Array.isArray(skill.examples) && skill.examples.length) sidecar.examples = skill.examples
  if (skill.metadata) sidecar.metadata = skill.metadata
  return sidecar
}

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
  lines.push(`name: ${escapeYamlScalar(skill.name)}`)
  if (skill.description) {
    // Single-line description per Claude convention; collapse newlines.
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

function buildSkillMd(skill) {
  const promptsEn = skill.prompts?.en || {}
  const sections = []
  sections.push(`# ${skill.name}`)
  if (skill.description) sections.push(skill.description.trim())

  if (promptsEn.trigger) {
    sections.push('## When to use', promptsEn.trigger.trim())
  }
  if (promptsEn.context) {
    sections.push('## Context', promptsEn.context.trim())
  }
  if (promptsEn.instructions) {
    sections.push('## Instructions', promptsEn.instructions.trim())
  }
  if (promptsEn.output_template) {
    sections.push('## Output template', promptsEn.output_template.trim())
  }
  if (Array.isArray(skill.checklist) && skill.checklist.length) {
    sections.push('## Checklist', skill.checklist.map((item) => `- ${item}`).join('\n'))
  }
  const steps = Array.isArray(skill.workflow?.steps) ? skill.workflow.steps : []
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

async function migrateSkill(file) {
  const sourcePath = path.join(LEGACY_DIR, file)
  let parsed
  try {
    parsed = JSON.parse(await fsp.readFile(sourcePath, 'utf8'))
  } catch (err) {
    return { id: file.replace(/\.json$/, ''), status: 'parse-error', error: err.message }
  }

  const id = parsed.id || file.replace(/\.json$/, '')
  const targetFolder = path.join(TARGET_DIR, id)
  const skillMdPath = path.join(targetFolder, 'SKILL.md')
  const skillJsonPath = path.join(targetFolder, 'skill.json')

  // Preserve handcrafted skill packages — never overwrite an existing SKILL.md
  // or skill.json sidecar.
  if (fs.existsSync(skillMdPath) || fs.existsSync(skillJsonPath)) {
    return { id, status: 'skipped-existing' }
  }

  const promptsEn = parsed.prompts?.en || {}
  const fileMap = {
    'SKILL.md': buildSkillMd({ ...parsed, id }),
    'skill.json': JSON.stringify(buildSidecarJson({ ...parsed, id }), null, 2) + '\n',
    'TRIGGER.md': promptsEn.trigger ? `# ${parsed.name || id} — Trigger\n\n${promptsEn.trigger.trim()}\n` : null,
    'CONTEXT.md': promptsEn.context ? `# ${parsed.name || id} — Context\n\n${promptsEn.context.trim()}\n` : null,
    'INSTRUCTIONS.md': promptsEn.instructions ? `# ${parsed.name || id} — Instructions\n\n${promptsEn.instructions.trim()}\n` : null,
    'OUTPUT_TEMPLATE.md': promptsEn.output_template ? `# ${parsed.name || id} — Output Template\n\n${promptsEn.output_template.trim()}\n` : null,
    'CHECKLIST.md': checklistToMarkdown(parsed.checklist),
    'WORKFLOW.md': workflowToMarkdown(parsed.workflow),
    'EXAMPLES.md': examplesToMarkdown(parsed.examples),
  }

  if (WRITE) {
    await fsp.mkdir(targetFolder, { recursive: true })
    for (const [filename, contents] of Object.entries(fileMap)) {
      if (!contents) continue
      await fsp.writeFile(path.join(targetFolder, filename), contents, 'utf8')
    }
  }

  return {
    id,
    status: 'migrated',
    files: Object.entries(fileMap).filter(([, contents]) => contents).map(([name]) => name),
  }
}

async function main() {
  if (!fs.existsSync(LEGACY_DIR)) {
    console.error(`Legacy skills directory not found: ${LEGACY_DIR}`)
    process.exit(1)
  }

  if (!fs.existsSync(TARGET_DIR)) {
    if (WRITE) {
      fs.mkdirSync(TARGET_DIR, { recursive: true })
    } else {
      console.log(`(dry run) would create ${TARGET_DIR}`)
    }
  }

  const files = listJsonFiles(LEGACY_DIR)
  console.log(`Found ${files.length} legacy skill files in ${LEGACY_DIR}`)
  console.log(`Target: ${TARGET_DIR}`)
  console.log(`Mode: ${WRITE ? 'WRITE' : 'dry-run (pass --write to actually create files)'}`)
  console.log('')

  const results = await Promise.all(files.map((file) => migrateSkill(file)))

  const migrated = results.filter((r) => r.status === 'migrated')
  const skipped = results.filter((r) => r.status === 'skipped-existing')
  const errors = results.filter((r) => r.status === 'parse-error')

  console.log(`Migrated: ${migrated.length}`)
  console.log(`Skipped (folder already exists): ${skipped.length}`)
  console.log(`Parse errors: ${errors.length}`)

  if (skipped.length) {
    console.log(`  skipped: ${skipped.map((r) => r.id).slice(0, 8).join(', ')}${skipped.length > 8 ? ', …' : ''}`)
  }
  if (errors.length) {
    console.log('')
    console.log('Errors:')
    for (const err of errors) console.log(`  ${err.id}: ${err.error}`)
  }
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
