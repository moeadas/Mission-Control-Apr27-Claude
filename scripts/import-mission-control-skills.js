const fs = require('fs')
const path = require('path')

const inputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(process.cwd(), 'MISSION_CONTROL_SKILLS.md')
const skillsDir = path.join(process.cwd(), 'src', 'config', 'skills')
const schemaUrl = '/src/config/schemas/skill.schema.json'
const lastUpdated = '2026-03-30'

const RESERVED_SECTION_NAMES = new Set(['Workflow', 'Output', 'Inputs', 'Tools', 'When Not to Use'])

const CATEGORY_MAP = {
  Analytics: 'analytics',
  'Business Development': 'business-development',
  'Client Management': 'client-management',
  'Client Services': 'client-services',
  Content: 'content',
  Creative: 'creative',
  Media: 'media',
  Operations: 'operations',
  'Project Management': 'project-management',
  Research: 'research',
  Strategy: 'strategy',
  General: 'general',
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function listExistingSkillFiles() {
  return fs
    .readdirSync(skillsDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => path.join(skillsDir, file))
}

function buildAgentSkillMap() {
  const agentsRoot = path.join(process.cwd(), 'src', 'config', 'agents')
  const skillToAgents = new Map()

  for (const entry of fs.readdirSync(agentsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const agentPath = path.join(agentsRoot, entry.name, 'agent.json')
    if (!fs.existsSync(agentPath)) continue
    const agent = readJson(agentPath)
    for (const skillId of Array.isArray(agent.skills) ? agent.skills : []) {
      if (!skillToAgents.has(skillId)) skillToAgents.set(skillId, [])
      skillToAgents.get(skillId).push(agent.id)
    }
  }

  return skillToAgents
}

function parseTags(line) {
  return [...line.matchAll(/`([^`]+)`/g)].map((match) => match[1].trim()).filter(Boolean)
}

function extractDescriptionAndTrigger(rawDescription) {
  const marker = ' Use this skill'
  const idx = rawDescription.indexOf(marker)
  if (idx === -1) {
    return {
      description: rawDescription.trim(),
      trigger: rawDescription.trim(),
    }
  }

  return {
    description: rawDescription.slice(0, idx).trim(),
    trigger: `Use this skill${rawDescription.slice(idx + marker.length).trim()}`,
  }
}

function parseInputs(sectionLines) {
  const rows = sectionLines
    .filter((line) => /^\|/.test(line))
    .slice(2)
    .map((line) => line.trim())
    .filter(Boolean)

  return rows
    .map((line) => {
      const cols = line
        .split('|')
        .slice(1, -1)
        .map((part) => part.trim())

      if (cols.length < 4) return null
      return {
        name: cols[0].replace(/`/g, '').replace(/^\{\{|\}\}$/g, ''),
        type: cols[1] || 'string',
        required: /^yes$/i.test(cols[2]),
        description: cols[3] || '',
      }
    })
    .filter(Boolean)
}

function parseWorkflow(sectionLines) {
  const steps = []
  let current = null

  for (const line of sectionLines) {
    const stepMatch = line.match(/^\d+\.\s+\*\*(.+?)\*\*\s+—\s+(.+)$/)
    if (stepMatch) {
      if (current) steps.push(current)
      current = {
        step: steps.length + 1,
        name: stepMatch[1].trim(),
        action: stepMatch[2].trim(),
        verify: '',
      }
      continue
    }

    const doneMatch = line.match(/^\s*-\s*✓\s*Done when:\s*(.+)$/)
    if (doneMatch && current) {
      current.verify = doneMatch[1].trim()
    }
  }

  if (current) steps.push(current)
  return steps
}

function parseSkillsDocument(markdown) {
  const lines = markdown.split(/\r?\n/)
  const skills = []
  let currentCategory = null
  let currentSkill = null

  function finalizeSkill() {
    if (!currentSkill) return
    skills.push(currentSkill)
    currentSkill = null
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const categoryMatch = line.match(/^##\s+(.+)$/)
    if (categoryMatch && !RESERVED_SECTION_NAMES.has(categoryMatch[1].trim())) {
      finalizeSkill()
      currentCategory = categoryMatch[1].trim()
      continue
    }

    const nameMatch = line.match(/^name:\s*(.+)$/)
    if (nameMatch) {
      finalizeSkill()
      currentSkill = {
        categoryName: currentCategory,
        id: nameMatch[1].trim(),
        descriptionLine: '',
        title: '',
        difficulty: 'intermediate',
        freedom: 'medium',
        context: '',
        workflowLines: [],
        outputLines: [],
        inputLines: [],
        toolLines: [],
        whenNotToUseLines: [],
        tagsLine: '',
      }
      continue
    }

    if (!currentSkill) continue

    const descriptionMatch = line.match(/^description:\s*(.+)$/)
    if (descriptionMatch) {
      currentSkill.descriptionLine = descriptionMatch[1].trim()
      continue
    }

    const titleMatch = line.match(/^###\s+(.+)$/)
    if (titleMatch) {
      currentSkill.title = titleMatch[1].trim()
      continue
    }

    const categoryMetaMatch = line.match(/^\*\*Category:\*\*\s*(.+?)\s+\|\s+\*\*Difficulty:\*\*\s*(.+?)\s+\|\s+\*\*Freedom:\*\*\s*(.+)$/)
    if (categoryMetaMatch) {
      currentSkill.categoryName = categoryMetaMatch[1].trim()
      currentSkill.difficulty = categoryMetaMatch[2].trim().toLowerCase()
      currentSkill.freedom = categoryMetaMatch[3].trim().toLowerCase()
      let j = i + 1
      const contextLines = []
      while (j < lines.length && lines[j].trim() && !/^##\s+/.test(lines[j])) {
        contextLines.push(lines[j].trim())
        j += 1
      }
      currentSkill.context = contextLines.join(' ').trim()
      continue
    }

    if (/^##\s+Workflow$/.test(line)) {
      let j = i + 1
      while (j < lines.length && !/^##\s+(Output|Inputs|Tools|When Not to Use)$/.test(lines[j])) {
        currentSkill.workflowLines.push(lines[j])
        j += 1
      }
      i = j - 1
      continue
    }

    if (/^##\s+Output$/.test(line)) {
      let j = i + 1
      while (j < lines.length && !/^##\s+(Inputs|Tools|When Not to Use)$/.test(lines[j])) {
        currentSkill.outputLines.push(lines[j])
        j += 1
      }
      i = j - 1
      continue
    }

    if (/^##\s+Inputs$/.test(line)) {
      let j = i + 1
      while (j < lines.length && !/^##\s+(Tools|When Not to Use)$/.test(lines[j])) {
        currentSkill.inputLines.push(lines[j])
        j += 1
      }
      i = j - 1
      continue
    }

    if (/^##\s+Tools$/.test(line)) {
      let j = i + 1
      while (j < lines.length && !/^##\s+When Not to Use$/.test(lines[j]) && !/^---$/.test(lines[j])) {
        if (/^`/.test(lines[j].trim())) {
          currentSkill.tagsLine = lines[j].trim()
        } else {
          currentSkill.toolLines.push(lines[j])
        }
        j += 1
      }
      i = j - 1
      continue
    }

    if (/^##\s+When Not to Use$/.test(line)) {
      let j = i + 1
      while (j < lines.length && !/^---$/.test(lines[j])) {
        currentSkill.whenNotToUseLines.push(lines[j])
        j += 1
      }
      i = j - 1
    }
  }

  finalizeSkill()
  return skills
}

function buildSkillJson(parsed, existing, agentSkillMap) {
  const descriptionParts = extractDescriptionAndTrigger(parsed.descriptionLine)
  const workflowSteps = parseWorkflow(parsed.workflowLines)
  const inputs = parseInputs(parsed.inputLines)
  const tags = parseTags(parsed.tagsLine)
  const tools = parsed.toolLines
    .map((line) => line.replace(/^-+\s*/, '').trim())
    .filter(Boolean)
  const outputTemplate = parsed.outputLines.join('\n').trim()
  const whenNotToUse = parsed.whenNotToUseLines.join('\n').trim()

  const instructionSections = [
    `## ${parsed.title || parsed.id}`,
    parsed.workflowLines.join('\n').trim(),
    inputs.length
      ? ['## Key Inputs', ...inputs.map((input) => `- ${input.name}: ${input.description}`)].join('\n')
      : '',
    whenNotToUse ? `## When Not to Use\n${whenNotToUse}` : '',
  ].filter(Boolean)

  return {
    $schema: schemaUrl,
    id: parsed.id,
    name: parsed.title || existing?.name || parsed.id,
    description: descriptionParts.description,
    category: CATEGORY_MAP[parsed.categoryName] || slugify(parsed.categoryName || 'general'),
    difficulty: parsed.difficulty || existing?.difficulty || 'intermediate',
    freedom: parsed.freedom || existing?.freedom || 'medium',
    prompts: {
      en: {
        trigger: descriptionParts.trigger,
        context: parsed.context || existing?.prompts?.en?.context || '',
        instructions: instructionSections.join('\n\n'),
        output_template: outputTemplate,
      },
    },
    variables: inputs,
    inputs,
    outputs: Array.isArray(existing?.outputs) ? existing.outputs : [],
    workflow: {
      steps: workflowSteps,
    },
    examples: Array.isArray(existing?.examples) ? existing.examples : [],
    checklist:
      workflowSteps.map((step) => step.verify).filter(Boolean).length
        ? workflowSteps.map((step) => step.verify).filter(Boolean)
        : Array.isArray(existing?.checklist)
          ? existing.checklist
          : [],
    tools,
    agents: agentSkillMap.get(parsed.id) || [],
    pipelines: Array.isArray(existing?.pipelines) ? existing.pipelines : [],
    metadata: {
      ...(existing?.metadata || {}),
      version: existing?.metadata?.version || '1.0',
      author: existing?.metadata?.author || 'agency',
      tags,
      lastUpdated,
    },
  }
}

function buildSkillsLibrary(skills, existingLibrary) {
  const grouped = new Map()

  for (const skill of skills) {
    if (!grouped.has(skill.category)) {
      grouped.set(skill.category, [])
    }
    grouped.get(skill.category).push({
      id: skill.id,
      name: skill.name,
      description: skill.description,
    })
  }

  const orderedCategories = []
  const seen = new Set()

  const existingCategories = Array.isArray(existingLibrary.skillCategories) ? existingLibrary.skillCategories : []
  for (const category of existingCategories) {
    if (!grouped.has(category.id)) continue
    orderedCategories.push({
      id: category.id,
      name: category.name,
      skills: grouped.get(category.id).sort((a, b) => a.name.localeCompare(b.name)),
    })
    seen.add(category.id)
  }

  for (const [id, categorySkills] of grouped.entries()) {
    if (seen.has(id)) continue
    orderedCategories.push({
      id,
      name: id
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' '),
      skills: categorySkills.sort((a, b) => a.name.localeCompare(b.name)),
    })
  }

  return {
    ...existingLibrary,
    metadata: {
      ...(existingLibrary.metadata || {}),
      lastUpdated,
    },
    skillCategories: orderedCategories,
  }
}

function main() {
  const markdown = fs.readFileSync(inputPath, 'utf8')
  const parsedSkills = parseSkillsDocument(markdown)
  const existingFiles = listExistingSkillFiles()
  const existingById = new Map(
    existingFiles.map((filePath) => {
      const json = readJson(filePath)
      return [json.id, json]
    })
  )
  const agentSkillMap = buildAgentSkillMap()

  const skillJsons = parsedSkills
    .filter((skill) => skill.id !== 'skills-library')
    .map((skill) => buildSkillJson(skill, existingById.get(skill.id), agentSkillMap))

  for (const skillJson of skillJsons) {
    const outputPath = path.join(skillsDir, `${skillJson.id}.json`)
    fs.writeFileSync(outputPath, `${JSON.stringify(skillJson, null, 2)}\n`)
  }

  const existingLibrary = readJson(path.join(skillsDir, 'skills-library.json'))
  const nextLibrary = buildSkillsLibrary(skillJsons, existingLibrary)
  fs.writeFileSync(path.join(skillsDir, 'skills-library.json'), `${JSON.stringify(nextLibrary, null, 2)}\n`)

  console.log(`Imported ${skillJsons.length} skill files and refreshed skills-library.json`)
}

main()
