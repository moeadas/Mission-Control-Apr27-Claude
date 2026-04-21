const fs = require('fs')
const path = require('path')

const root = process.cwd()
const agentsRoot = path.join(root, 'src/config/agents')
const generatedPath = path.join(agentsRoot, 'generated.ts')

const REQUIRED_FILES = [
  'agent.json',
  'SOUL.md',
  'IDENTITY.md',
  'STYLE.md',
  'RULES.md',
  'CONTEXT.md',
  'SKILL_SELECTION.md',
  'HANDOFFS.md',
  'MEMORY.md',
  'HEARTBEAT.md',
]

const RUNTIME_META = {
  iris: { specialty: 'project-management', unit: 'orchestration', accentColor: 'purple', primaryOutputs: ['status-report', 'client-brief'], position: { x: 470, y: 70, room: 'orchestration' } },
  piper: { specialty: 'project-management', unit: 'orchestration', accentColor: 'yellow', primaryOutputs: ['status-report', 'client-brief'], position: { x: 500, y: 70, room: 'orchestration' } },
  sage: { specialty: 'client-services', unit: 'client-services', accentColor: 'blue', primaryOutputs: ['status-report', 'client-brief'], position: { x: 120, y: 270, room: 'client-services' } },
  maya: { specialty: 'strategy', unit: 'client-services', accentColor: 'purple', primaryOutputs: ['strategy-brief', 'campaign-strategy', 'client-brief'], position: { x: 180, y: 270, room: 'client-services' } },
  finn: { specialty: 'creative', unit: 'creative', accentColor: 'green', primaryOutputs: ['creative-asset', 'campaign-strategy'], position: { x: 390, y: 260, room: 'creative' } },
  echo: { specialty: 'copy', unit: 'creative', accentColor: 'green', primaryOutputs: ['campaign-copy', 'content-calendar'], position: { x: 500, y: 260, room: 'creative' } },
  lyra: { specialty: 'design', unit: 'creative', accentColor: 'green', primaryOutputs: ['creative-asset'], position: { x: 440, y: 260, room: 'creative' } },
  nova: { specialty: 'media-planning', unit: 'media', accentColor: 'pink', primaryOutputs: ['media-plan', 'budget-sheet', 'kpi-forecast'], position: { x: 720, y: 260, room: 'media' } },
  dex: { specialty: 'performance', unit: 'media', accentColor: 'pink', primaryOutputs: ['status-report', 'kpi-forecast'], position: { x: 820, y: 260, room: 'media' } },
  atlas: { specialty: 'research', unit: 'research', accentColor: 'sky', primaryOutputs: ['research-brief', 'strategy-brief'], position: { x: 380, y: 440, room: 'research' } },
}

function toLiteral(value) {
  return JSON.stringify(value, null, 2)
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8').trim()
}

function firstContentLine(markdown) {
  return (
    markdown
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith('#') && !line.startsWith('- ') && !line.startsWith('|')) || ''
  )
}

function firstSection(markdown, headingPrefix) {
  const parts = markdown.split(`## ${headingPrefix}`)
  return (parts[0] || markdown).trim()
}

function ensureAgentFolder(agentId) {
  const agentDir = path.join(agentsRoot, agentId)
  const missing = REQUIRED_FILES.filter((file) => !fs.existsSync(path.join(agentDir, file)))
  if (missing.length) {
    throw new Error(`Agent ${agentId} is missing required files: ${missing.join(', ')}`)
  }
  return agentDir
}

function loadAgentBundle(agentId) {
  const meta = RUNTIME_META[agentId]
  if (!meta) {
    throw new Error(`Missing runtime metadata for ${agentId}`)
  }

  const agentDir = ensureAgentFolder(agentId)
  const agentJson = JSON.parse(readText(path.join(agentDir, 'agent.json')))
  const soul = readText(path.join(agentDir, 'SOUL.md'))
  const identity = readText(path.join(agentDir, 'IDENTITY.md'))
  const style = readText(path.join(agentDir, 'STYLE.md'))
  const rules = readText(path.join(agentDir, 'RULES.md'))
  const context = readText(path.join(agentDir, 'CONTEXT.md'))
  const skillSelection = readText(path.join(agentDir, 'SKILL_SELECTION.md'))
  const handoffsDoc = readText(path.join(agentDir, 'HANDOFFS.md'))
  const memoryDoc = readText(path.join(agentDir, 'MEMORY.md'))
  const heartbeat = readText(path.join(agentDir, 'HEARTBEAT.md'))
  const playbooksPath = path.join(agentDir, 'PLAYBOOKS.md')
  const playbooks = fs.existsSync(playbooksPath) ? readText(playbooksPath) : ''

  const soulSummary = firstContentLine(soul)
  const methodologySummary = firstSection(identity, 'What')

  const agent = {
    id: agentJson.id,
    name: agentJson.name,
    role: agentJson.role,
    photoUrl: undefined,
    division: agentJson.division,
    specialty: meta.specialty,
    unit: meta.unit,
    color: agentJson.color,
    accentColor: meta.accentColor,
    avatar: agentJson.avatar || `bot-${meta.accentColor}`,
    systemPrompt: [
      `You are ${agentJson.name}, ${agentJson.role}.`,
      soul,
      identity,
      style,
      rules,
      context,
      skillSelection,
      handoffsDoc,
      heartbeat,
    ].filter(Boolean).join('\n\n'),
    provider: agentJson.ai.provider,
    model: agentJson.ai.model,
    temperature: agentJson.ai.temperature,
    maxTokens: agentJson.ai.maxTokens,
    tools: agentJson.tools || [],
    skills: agentJson.skills || [],
    responsibilities: agentJson.qualityCheckpoints || [],
    primaryOutputs: meta.primaryOutputs,
    status: agentJson.status || 'idle',
    currentTask: undefined,
    lastActive: undefined,
    workload: 0,
    position: meta.position,
    bio: soulSummary,
    methodology: methodologySummary,
    handoffs: agentJson.handoffs || { receivesFrom: [], sendsTo: [] },
    qualityCheckpoints: agentJson.qualityCheckpoints || [],
  }

  return {
    agent,
    soul,
    identity,
    style,
    rules,
    context,
    skillSelection,
    handoffsDoc,
    memoryDoc,
    heartbeat,
    playbooks,
    qualityCheckpoints: agentJson.qualityCheckpoints || [],
  }
}

const agentIds = fs
  .readdirSync(agentsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b))

if (!agentIds.length) {
  throw new Error('No agent folders found in src/config/agents')
}

const bundles = agentIds.map((agentId) => [agentId, loadAgentBundle(agentId)])

const out = []
out.push("import type { Agent } from '@/lib/types'")
out.push('')
out.push('export interface AgentArchitectureBundle {')
out.push('  agent: Agent')
out.push('  soul: string')
out.push('  identity: string')
out.push('  style: string')
out.push('  rules: string')
out.push('  context: string')
out.push('  skillSelection: string')
out.push('  handoffsDoc: string')
out.push('  memoryDoc: string')
out.push('  heartbeat: string')
out.push('  playbooks?: string')
out.push('  qualityCheckpoints: string[]')
out.push('}')
out.push('')
out.push('const BUNDLES: Record<string, AgentArchitectureBundle> = {')

for (const [agentId, bundle] of bundles) {
  out.push(`  ${JSON.stringify(agentId)}: {`)
  out.push(`    agent: ${toLiteral(bundle.agent).replace(/^/gm, '    ')},`)
  out.push(`    soul: ${JSON.stringify(bundle.soul)},`)
  out.push(`    identity: ${JSON.stringify(bundle.identity)},`)
  out.push(`    style: ${JSON.stringify(bundle.style)},`)
  out.push(`    rules: ${JSON.stringify(bundle.rules)},`)
  out.push(`    context: ${JSON.stringify(bundle.context)},`)
  out.push(`    skillSelection: ${JSON.stringify(bundle.skillSelection)},`)
  out.push(`    handoffsDoc: ${JSON.stringify(bundle.handoffsDoc)},`)
  out.push(`    memoryDoc: ${JSON.stringify(bundle.memoryDoc)},`)
  out.push(`    heartbeat: ${JSON.stringify(bundle.heartbeat)},`)
  if (bundle.playbooks) {
    out.push(`    playbooks: ${JSON.stringify(bundle.playbooks)},`)
  }
  out.push(`    qualityCheckpoints: ${toLiteral(bundle.qualityCheckpoints).replace(/^/gm, '    ')},`)
  out.push('  },')
}

out.push('}')
out.push('')
out.push('export const AGENT_ARCHITECTURE_BUNDLES = BUNDLES')
out.push('export const CONFIG_AGENT_IDS = Object.keys(BUNDLES)')
out.push('export const CONFIG_AGENTS: Agent[] = Object.values(BUNDLES).map((bundle) => bundle.agent)')
out.push('')
out.push('export function getAgentArchitectureBundle(agentId: string) {')
out.push('  return BUNDLES[agentId] || null')
out.push('}')
out.push('')
out.push('export function getAgentArchitectureText(agentId: string) {')
out.push('  const bundle = BUNDLES[agentId]')
out.push('  if (!bundle) return null')
out.push('  return {')
out.push('    soul: bundle.soul,')
out.push('    identity: bundle.identity,')
out.push('    style: bundle.style,')
out.push('    rules: bundle.rules,')
out.push('    context: bundle.context,')
out.push('    skillSelection: bundle.skillSelection,')
out.push('    handoffsDoc: bundle.handoffsDoc,')
out.push('    memoryDoc: bundle.memoryDoc,')
out.push('    heartbeat: bundle.heartbeat,')
out.push("    playbooks: bundle.playbooks || '',")
out.push('  }')
out.push('}')

fs.writeFileSync(generatedPath, `${out.join('\n')}\n`)
console.log(`Generated ${agentIds.length} agents from folder-based config into ${generatedPath}`)
