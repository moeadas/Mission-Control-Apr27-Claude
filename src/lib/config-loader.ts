// Config Loader - Central utility for loading all editable JSON configs
// All configs are stored in /src/config/ and loaded dynamically

import workflowsData from '@/config/workflows/campaign-workflows.json'
import agentRolesData from '@/config/agent-roles/agent-roles.json'
import toolsData from '@/config/tools/tools-config.json'
import clientTemplatesData from '@/config/client-templates/client-templates.json'
import checkpointsData from '@/config/checkpoints/quality-checkpoints.json'

// Type definitions
export interface Workflow {
  id: string
  name: string
  description: string
  version: string
  phases: WorkflowPhase[]
  defaultTimeline: {
    totalDays: number
    phases: Record<string, number>
  }
  requiredRoles: string[]
}

export interface WorkflowPhase {
  id: string
  name: string
  order: number
  activities: WorkflowActivity[]
}

export interface WorkflowActivity {
  id: string
  name: string
  description: string
  assignedRole: string
  inputs: string[]
  outputs: string[]
  checklist: string[]
}

export interface AgentRole {
  id: string
  name: string
  division: string
  color: string
  accentColor: string
  avatar: string
  bio: string
  methodology: string
  coreCompetencies: string[]
  tools: string[]
  responsibilities: string[]
  workProducts: string[]
  handoffProtocol: {
    receivesFrom: string[]
    deliversTo: string[]
    deliverableFormat: string
  }
  qualityCheckpoints: string[]
  aiConfig: {
    provider: string
    model: string
    temperature: number
    maxTokens: number
    systemPromptTemplate: string
  }
}

export interface Tool {
  id: string
  name: string
  description: string
  category: string
  apiConnected: boolean
  actions: string[]
  documentation: string
}

export interface ToolCategory {
  id: string
  name: string
  icon: string
  tools: Tool[]
}

export interface ClientTemplate {
  id: string
  name: string
  description: string
  sections: ClientSection[]
}

export interface ClientSection {
  id: string
  name: string
  order: number
  fields: ClientField[]
}

export interface ClientField {
  id: string
  label: string
  type: string
  required?: boolean
  placeholder?: string
  options?: string[]
}

export interface QualityCheckpoint {
  id: string
  label: string
  description: string
  verifiedBy: string
  required: boolean
  items: string[]
}

// Config Registry - Single source of truth
export const ConfigRegistry = {
  workflows: workflowsData.workflows as unknown as Workflow[],
  agentRoles: agentRolesData.roles as unknown as AgentRole[],
  toolCategories: toolsData.toolCategories as ToolCategory[],
  toolConnections: toolsData.toolConnections as Record<string, any>,
  clientTemplates: clientTemplatesData.clientTemplates as ClientTemplate[],
  checkpointTypes: checkpointsData.checkpointTypes as any[],
  qualityStandards: checkpointsData.qualityStandards as any,
}

// Helper functions
export function getWorkflowById(id: string): Workflow | undefined {
  return ConfigRegistry.workflows.find(w => w.id === id)
}

export function getAgentRoleById(id: string): AgentRole | undefined {
  return ConfigRegistry.agentRoles.find(r => r.id === id)
}

export function getAgentRolesByDivision(division: string): AgentRole[] {
  return ConfigRegistry.agentRoles.filter(r => r.division === division)
}

export function getToolById(id: string): Tool | undefined {
  for (const category of ConfigRegistry.toolCategories) {
    const tool = category.tools.find(t => t.id === id)
    if (tool) return tool
  }
  return undefined
}

export function getToolsByCategory(categoryId: string): Tool[] {
  const category = ConfigRegistry.toolCategories.find(c => c.id === categoryId)
  return category?.tools || []
}

export function getClientTemplateById(id: string): ClientTemplate | undefined {
  return ConfigRegistry.clientTemplates.find(t => t.id === id)
}

export function getCheckpointsByPhase(phase: string): any[] {
  return ConfigRegistry.checkpointTypes
    .filter(c => c.phase === phase)
    .flatMap(c => c.checkpoints)
}

export function getAllTools(): Tool[] {
  return ConfigRegistry.toolCategories.flatMap(c => c.tools)
}

export function getRolesForWorkflow(workflowId: string): AgentRole[] {
  const workflow = getWorkflowById(workflowId)
  if (!workflow) return []
  return workflow.requiredRoles
    .map(roleId => getAgentRoleById(roleId))
    .filter((r): r is AgentRole => r !== undefined)
}

// Export config for external editing (e.g., admin panel)
export function getEditableConfigs() {
  return {
    workflows: ConfigRegistry.workflows,
    agentRoles: ConfigRegistry.agentRoles,
    toolCategories: ConfigRegistry.toolCategories,
    clientTemplates: ConfigRegistry.clientTemplates,
    checkpointTypes: ConfigRegistry.checkpointTypes,
    qualityStandards: ConfigRegistry.qualityStandards,
  }
}

// Build system prompt from role template
export function buildAgentSystemPrompt(
  roleId: string,
  context: {
    project?: string
    client?: string
    audience?: string
    industry?: string
    teamMembers?: string[]
    deadline?: string
    channels?: string[]
    budget?: string
    campaign?: string
    website?: string
    keywords?: string[]
    pillars?: string[]
    [key: string]: any
  }
): string {
  const role = getAgentRoleById(roleId)
  if (!role) return 'You are a helpful AI agent.'

  let prompt = role.aiConfig.systemPromptTemplate

  // Replace all {{variables}}
  Object.entries(context).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`
    if (Array.isArray(value)) {
      prompt = prompt.replace(placeholder, value.join(', '))
    } else if (value !== undefined) {
      prompt = prompt.replace(placeholder, String(value))
    }
  })

  return prompt
}

// Get workflow timeline with roles
export function getWorkflowTimeline(workflowId: string) {
  const workflow = getWorkflowById(workflowId)
  if (!workflow) return null

  const phases = workflow.phases.map(phase => ({
    ...phase,
    activities: phase.activities.map(activity => ({
      ...activity,
      assignedRole: getAgentRoleById(activity.assignedRole),
    })),
  }))

  return {
    ...workflow,
    phases,
  }
}
