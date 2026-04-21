// Workflow Engine - Core engine for executing workflows and managing task flow
// Uses JSON configs from /src/config/workflows/

import { v4 as uuidv4 } from 'uuid'
import { 
  getWorkflowById, 
  getAgentRoleById, 
  getCheckpointsByPhase,
  buildAgentSystemPrompt,
  Workflow,
  WorkflowPhase,
  WorkflowActivity,
  AgentRole
} from './config-loader'

// Task generated from a workflow activity
export interface WorkflowTask {
  id: string
  workflowId: string
  workflowName: string
  phaseId: string
  phaseName: string
  activityId: string
  activityName: string
  description: string
  assignedRole: string
  assignedRoleName: string
  inputs: string[]
  outputs: string[]
  checklist: string[]
  checklistStatus: Record<string, boolean>
  status: 'queued' | 'in_progress' | 'blocked' | 'review' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high'
  clientId?: string
  campaignId?: string
  missionId?: string
  agentId?: string
  progress: number
  createdAt: string
  updatedAt: string
  dueDate?: string
  startedAt?: string
  completedAt?: string
  blockedReason?: string
  reviewNotes?: string
}

// Phase gate - must pass all checkpoints before phase completes
export interface PhaseGate {
  phaseId: string
  phaseName: string
  checkpoints: {
    id: string
    label: string
    description: string
    items: string[]
    status: Record<string, boolean>
    verifiedBy: string
    required: boolean
    passed: boolean
    passedAt?: string
    passedBy?: string
  }[]
  status: 'pending' | 'in_progress' | 'passed' | 'failed'
}

// Workflow execution instance
export interface WorkflowInstance {
  id: string
  workflowId: string
  workflowName: string
  workflowVersion: string
  clientId?: string
  campaignId?: string
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled'
  currentPhaseIndex: number
  phases: {
    id: string
    name: string
    status: 'locked' | 'active' | 'completed' | 'skipped'
    activities: WorkflowTask[]
    gate: PhaseGate
  }[]
  totalTasks: number
  completedTasks: number
  progress: number
  createdAt: string
  updatedAt: string
  startedAt?: string
  completedAt?: string
  createdBy: string
}

// Create tasks from a workflow phase
export function createTasksFromPhase(
  workflow: Workflow,
  phase: WorkflowPhase,
  context: {
    clientId?: string
    campaignId?: string
    missionId?: string
    agentId?: string
    dueDate?: string
  }
): WorkflowTask[] {
  return phase.activities.map(activity => {
    const role = getAgentRoleById(activity.assignedRole)
    return {
      id: uuidv4(),
      workflowId: workflow.id,
      workflowName: workflow.name,
      phaseId: phase.id,
      phaseName: phase.name,
      activityId: activity.id,
      activityName: activity.name,
      description: activity.description,
      assignedRole: activity.assignedRole,
      assignedRoleName: role?.name || activity.assignedRole,
      inputs: activity.inputs,
      outputs: activity.outputs,
      checklist: activity.checklist,
      checklistStatus: Object.fromEntries(activity.checklist.map(item => [item, false])),
      status: 'queued' as const,
      priority: 'medium' as const,
      clientId: context.clientId,
      campaignId: context.campaignId,
      missionId: context.missionId,
      agentId: context.agentId,
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dueDate: context.dueDate,
    }
  })
}

// Create a phase gate from config checkpoints
export function createPhaseGate(phase: WorkflowPhase): PhaseGate {
  const checkpoints = getCheckpointsByPhase(phase.id)
  return {
    phaseId: phase.id,
    phaseName: phase.name,
    checkpoints: checkpoints.map(cp => ({
      ...cp,
      status: Object.fromEntries(cp.items.map((item: string) => [item, false])),
      passed: false,
    })),
    status: 'pending',
  }
}

// Start a workflow instance
export function startWorkflow(
  workflowId: string,
  context: {
    clientId?: string
    campaignId?: string
    missionId?: string
    agentId?: string
    createdBy: string
    dueDate?: string
  }
): WorkflowInstance | null {
  const workflow = getWorkflowById(workflowId)
  if (!workflow) return null

  const phases = workflow.phases.map(phase => ({
    id: phase.id,
    name: phase.name,
    status: phase.order === 1 ? 'active' as const : 'locked' as const,
    activities: createTasksFromPhase(workflow, phase, context),
    gate: createPhaseGate(phase),
  }))

  const totalTasks = phases.reduce((sum, p) => sum + p.activities.length, 0)

  return {
    id: uuidv4(),
    workflowId: workflow.id,
    workflowName: workflow.name,
    workflowVersion: workflow.version,
    clientId: context.clientId,
    campaignId: context.campaignId,
    status: 'active',
    currentPhaseIndex: 0,
    phases,
    totalTasks,
    completedTasks: 0,
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    createdBy: context.createdBy,
  }
}

// Update task checklist
export function updateTaskChecklist(
  task: WorkflowTask,
  checklistItem: string,
  checked: boolean
): WorkflowTask {
  const newStatus = { ...task.checklistStatus, [checklistItem]: checked }
  const allChecked = Object.values(newStatus).every(Boolean)
  
  return {
    ...task,
    checklistStatus: newStatus,
    status: allChecked ? 'completed' : task.status,
    progress: Math.round(
      (Object.values(newStatus).filter(Boolean).length / task.checklist.length) * 100
    ),
    updatedAt: new Date().toISOString(),
  }
}

// Check if phase gate is passed
export function checkPhaseGate(gate: PhaseGate): boolean {
  return gate.checkpoints
    .filter(cp => cp.required)
    .every(cp => Object.values(cp.status).every(Boolean))
}

// Get next locked phase
export function unlockNextPhase(instance: WorkflowInstance): WorkflowInstance {
  const { phases, currentPhaseIndex } = instance
  
  // Check if current phase is complete
  const currentPhase = phases[currentPhaseIndex]
  const currentComplete = currentPhase.activities.every(
    a => a.status === 'completed' || a.status === 'cancelled'
  )
  
  if (!currentComplete) return instance
  
  // Check gate
  const gatePassed = checkPhaseGate(currentPhase.gate)
  if (!gatePassed) return instance
  
  // Unlock next phase
  const nextPhaseIndex = currentPhaseIndex + 1
  if (nextPhaseIndex >= phases.length) {
    // Workflow complete
    return {
      ...instance,
      status: 'completed',
      completedAt: new Date().toISOString(),
      progress: 100,
      updatedAt: new Date().toISOString(),
    }
  }
  
  const newPhases = [...phases]
  newPhases[currentPhaseIndex] = {
    ...currentPhase,
    status: 'completed',
    gate: { ...currentPhase.gate, status: 'passed' },
  }
  newPhases[nextPhaseIndex] = {
    ...newPhases[nextPhaseIndex],
    status: 'active',
  }
  
  const completedTasks = newPhases.reduce(
    (sum, p) => sum + p.activities.filter(a => a.status === 'completed').length,
    0
  )
  
  return {
    ...instance,
    phases: newPhases,
    currentPhaseIndex: nextPhaseIndex,
    completedTasks,
    progress: Math.round((completedTasks / instance.totalTasks) * 100),
    updatedAt: new Date().toISOString(),
  }
}

// Build agent prompt for specific task
export function buildTaskPrompt(
  task: WorkflowTask,
  context: {
    clientName?: string
    clientIndustry?: string
    campaignName?: string
    additionalContext?: Record<string, any>
  }
): string {
  const role = getAgentRoleById(task.assignedRole)
  if (!role) return `Complete the task: ${task.activityName}`
  
  const basePrompt = buildAgentSystemPrompt(task.assignedRole, {
    project: context.campaignName || task.workflowName,
    client: context.clientName,
    industry: context.clientIndustry,
    ...context.additionalContext,
  })
  
  const taskSpecific = `
  
TASK: ${task.activityName}
DESCRIPTION: ${task.description}

DELIVERABLES (checklist to complete):
${task.checklist.map(item => `- [ ] ${item}`).join('\n')}

INPUTS available:
${task.inputs.map(i => `- ${i}`).join('\n')}

EXPECTED OUTPUTS:
${task.outputs.map(o => `- ${o}`).join('\n')}

Please execute this task following your methodology (${role.methodology}).
Provide your work product and mark each checklist item as complete when done.
`
  
  return basePrompt + taskSpecific
}

// Get tasks by status
export function getTasksByStatus(
  instance: WorkflowInstance,
  status: WorkflowTask['status']
): WorkflowTask[] {
  return instance.phases.flatMap(p => p.activities.filter(a => a.status === status))
}

// Get active tasks across all phases
export function getActiveTasks(instance: WorkflowInstance): WorkflowTask[] {
  return instance.phases.flatMap(p => 
    p.activities.filter(a => a.status === 'in_progress' || a.status === 'queued')
  )
}

// Priority order for sorting
export const PRIORITY_ORDER: Record<WorkflowTask['priority'], number> = {
  high: 0,
  medium: 1,
  low: 2,
}

// Sort tasks by priority and age
export function sortTasks(tasks: WorkflowTask[]): WorkflowTask[] {
  return [...tasks].sort((a, b) => {
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    if (priorityDiff !== 0) return priorityDiff
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
}
