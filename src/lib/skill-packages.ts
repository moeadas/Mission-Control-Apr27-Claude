import JSZip from 'jszip'
import path from 'node:path'

import type { Skill } from '@/lib/skill-schema'

export type ImportedBundleFile = {
  relativePath: string
  role: 'skill' | 'readme' | 'reference' | 'template' | 'script' | 'asset'
  size: number
  textContent?: string
  binaryContent?: Buffer
}

export type ImportedSkillBundle = {
  skill: Skill
  files: ImportedBundleFile[]
}

function normalizeSkillId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function titleizeSkillName(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function parseFrontmatter(content: string) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?/)
  const frontmatter: Record<string, string> = {}
  if (!match) return { frontmatter, body: content }

  for (const line of match[1].split('\n')) {
    const entry = line.match(/^([A-Za-z0-9_-]+):\s*(.+)$/)
    if (entry) {
      frontmatter[entry[1]] = entry[2].trim()
    }
  }

  return {
    frontmatter,
    body: content.slice(match[0].length),
  }
}

function extractSection(body: string, title: string) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`^##\\s+${escaped}\\s*\\n([\\s\\S]*?)(?=^##\\s+|\\Z)`, 'm')
  return body.match(regex)?.[1]?.trim() || ''
}

function inferCategory(description: string, body: string) {
  const haystack = `${description}\n${body}`.toLowerCase()
  if (haystack.includes('image') || haystack.includes('visual') || haystack.includes('brand')) {
    return 'creative'
  }
  if (haystack.includes('research') || haystack.includes('audit')) {
    return 'research'
  }
  if (haystack.includes('workflow') || haystack.includes('operations')) {
    return 'operations'
  }
  return 'operations'
}

function inferDifficulty(description: string, body: string): Skill['difficulty'] {
  const haystack = `${description}\n${body}`.toLowerCase()
  if (haystack.includes('advanced') || haystack.includes('professional-grade') || haystack.includes('complex')) {
    return 'advanced'
  }
  if (haystack.includes('beginner')) return 'beginner'
  return 'intermediate'
}

function inferAgents(skillId: string, body: string) {
  const haystack = `${skillId}\n${body}`.toLowerCase()
  if (haystack.includes('nano banana') || haystack.includes('image generation') || haystack.includes('visual')) {
    return ['lyra']
  }
  return []
}

function buildOutputTemplate(body: string) {
  if (body.toLowerCase().includes('image')) {
    return [
      '## Output Package',
      '',
      '### Primary Outcome',
      '- Final deliverable:',
      '- Format / aspect ratio:',
      '',
      '### Brand Lock',
      '- Colors:',
      '- Typography:',
      '- Template rules:',
      '',
      '### Execution Notes',
      '- References used:',
      '- Scripts / tools used:',
      '- Guardrails:',
    ].join('\n')
  }

  return [
    '## Output',
    '',
    '- Deliverable:',
    '- Key decisions:',
    '- Validation notes:',
  ].join('\n')
}

function toWorkflowSteps(workflowSection: string): Skill['workflow'] {
  const lines = workflowSection
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => /^(\d+\.|[-*])\s+/.test(line))

  return {
    steps: lines.map((line, index) => ({
      step: index + 1,
      name: line.replace(/^(\d+\.|[-*])\s+/, '').slice(0, 72),
      action: line.replace(/^(\d+\.|[-*])\s+/, ''),
      verify: 'Step completed and reflected in the final deliverable.',
    })),
  }
}

function textFileRole(relativePath: string): ImportedBundleFile['role'] {
  const lower = relativePath.toLowerCase()
  if (lower.endsWith('/skill.md') || lower === 'skill.md') return 'skill'
  if (lower.endsWith('/readme.md') || lower === 'readme.md') return 'readme'
  if (lower.includes('/references/')) return 'reference'
  if (lower.includes('/templates/')) return 'template'
  if (lower.includes('/scripts/')) return 'script'
  return 'asset'
}

function safeRelativePath(name: string) {
  const normalized = path.posix.normalize(name.replace(/^\/+/, ''))
  if (!normalized || normalized.startsWith('..') || path.posix.isAbsolute(normalized)) {
    return null
  }
  return normalized
}

function buildSkillFromBundle(skillMd: string, files: ImportedBundleFile[]): Skill {
  const { frontmatter, body } = parseFrontmatter(skillMd)
  const id = normalizeSkillId(frontmatter.name || frontmatter.id || 'imported-skill')
  const name = titleizeSkillName(frontmatter.name || frontmatter.id || 'Imported Skill')
  const description = frontmatter.description || 'Imported skill package.'
  const category = inferCategory(description, body)
  const brandSection = extractSection(body, 'Brand Identity & Layout Compliance')
  const capabilitiesSection = extractSection(body, 'Model Capabilities')
  const workflowSection = extractSection(body, 'Workflow')
  const scriptSection = extractSection(body, 'Script Usage')
  const outputSection = extractSection(body, 'Output Parameters')
  const limitationsSection = extractSection(body, 'Limitations to Communicate')
  const references = files.filter((file) => file.role === 'reference' && file.textContent)
  const templates = files.filter((file) => file.role === 'template')
  const scripts = files.filter((file) => file.role === 'script')
  const readme = files.find((file) => file.role === 'readme' && file.textContent)

  const bundledReferenceContext = [
    readme?.textContent ? `## Package README\n\n${readme.textContent.trim()}` : '',
    ...references.map((file) => `## Reference: ${file.relativePath}\n\n${file.textContent?.trim() || ''}`),
  ]
    .filter(Boolean)
    .join('\n\n')
    .trim()

  return {
    id,
    name,
    description,
    category,
    difficulty: inferDifficulty(description, body),
    freedom: 'medium',
    prompts: {
      en: {
        trigger:
          frontmatter.description ||
          'Use this skill when the task requires this specialized packaged workflow.',
        context: [
          brandSection ? `## Brand Identity\n\n${brandSection}` : '',
          capabilitiesSection ? `## Model Capabilities\n\n${capabilitiesSection}` : '',
          bundledReferenceContext ? bundledReferenceContext : '',
        ]
          .filter(Boolean)
          .join('\n\n')
          .trim(),
        instructions: [
          workflowSection ? `## Workflow\n\n${workflowSection}` : body.trim(),
          scriptSection ? `## Script Usage\n\n${scriptSection}` : '',
          templates.length
            ? `## Templates\n\nUse the packaged template files when the task provides template-driven constraints.\n${templates
                .map((file) => `- ${file.relativePath}`)
                .join('\n')}`
            : '',
          scripts.length
            ? `## Packaged Scripts\n\n${scripts.map((file) => `- ${file.relativePath}`).join('\n')}`
            : '',
        ]
          .filter(Boolean)
          .join('\n\n')
          .trim(),
        output_template: buildOutputTemplate(body),
      },
    },
    variables: [],
    inputs: [
      { name: 'brief', type: 'string', required: true, description: 'Task brief to execute with this skill' },
      { name: 'references', type: 'string', required: false, description: 'Optional reference assets or bundled references' },
    ],
    outputs: [],
    workflow: workflowSection ? toWorkflowSteps(workflowSection) : { steps: [] },
    tools: [
      ...(frontmatter['allowed-tools']
        ? frontmatter['allowed-tools'].split(',').map((item) => item.trim()).filter(Boolean)
        : []),
    ],
    agents: inferAgents(id, body),
    pipelines: [],
    checklist: [
      ...(brandSection ? ['Brand assets and layout rules were checked first.'] : []),
      ...(outputSection ? ['Output parameters were locked before generation.'] : []),
      ...(limitationsSection ? ['Known model limitations were considered.'] : []),
    ],
    examples: [],
    metadata: {
      version: '1.0',
      author: 'Imported Skill Package',
      tags: [category, 'package-import'],
      lastUpdated: new Date().toISOString().split('T')[0],
      bundle: {
        type: 'zip-package',
        entry: files.find((file) => file.role === 'skill')?.relativePath || 'SKILL.md',
        files: files.map((file) => ({
          relativePath: file.relativePath,
          role: file.role,
          size: file.size,
        })),
      },
    },
  }
}

export async function parseSkillZip(buffer: Buffer): Promise<ImportedSkillBundle> {
  const zip = await JSZip.loadAsync(buffer)
  const files: ImportedBundleFile[] = []

  for (const [name, zipFile] of Object.entries(zip.files)) {
    if (zipFile.dir) continue
    const relativePath = safeRelativePath(name)
    if (!relativePath) continue
    const role = textFileRole(relativePath)
    const data = await zipFile.async('nodebuffer')
    const isText = /\.(md|txt|json|ya?ml|py|ts|tsx|js|jsx)$/i.test(relativePath)
    files.push({
      relativePath,
      role,
      size: data.byteLength,
      textContent: isText ? data.toString('utf8') : undefined,
      binaryContent: isText ? undefined : data,
    })
  }

  const skillMd = files.find(
    (file) => file.role === 'skill' && path.posix.basename(file.relativePath).toLowerCase() === 'skill.md'
  )

  if (!skillMd?.textContent) {
    throw new Error('SKILL.md file not found in ZIP package.')
  }

  return {
    skill: buildSkillFromBundle(skillMd.textContent, files),
    files,
  }
}
