// Workflow Store - Manages workflow instances and pipeline state
// Integrates with config-loader for workflow definitions

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import { 
  WorkflowInstance, 
  WorkflowTask, 
  PhaseGate,
  startWorkflow,
  updateTaskChecklist,
  unlockNextPhase,
  buildTaskPrompt,
  sortTasks
} from './workflow-engine'
import { getWorkflowById, getAgentRoleById, Workflow } from './config-loader'

// Notification for agent handoff
export interface HandoffNotification {
  id: string
  fromAgentId: string
  fromAgentName: string
  toRole: string
  taskId: string
  taskName: string
  message: string
  timestamp: string
  read: boolean
}

interface WorkflowState {
  // All workflow instances
  workflowInstances: WorkflowInstance[]
  
  // Currently active workflow
  activeWorkflowId: string | null
  
  // Task handoff queue
  handoffQueue: HandoffNotification[]
  
  // Available workflows from config
  availableWorkflows: Workflow[]
  
  // Actions
  getWorkflowInstance: (id: string) => WorkflowInstance | undefined
  getActiveWorkflow: () => WorkflowInstance | undefined
  createWorkflowInstance: (workflowId: string, context: {
    clientId?: string
    campaignId?: string
    missionId?: string
    agentId?: string
    createdBy: string
    dueDate?: string
  }) => string
  cancelWorkflowInstance: (id: string) => void
  pauseWorkflowInstance: (id: string) => void
  resumeWorkflowInstance: (id: string) => void
  
  // Task actions
  updateTaskStatus: (instanceId: string, taskId: string, status: WorkflowTask['status']) => void
  updateTaskChecklist: (instanceId: string, taskId: string, checklistItem: string, checked: boolean) => void
  assignTask: (instanceId: string, taskId: string, agentId: string) => void
  setTaskPriority: (instanceId: string, taskId: string, priority: WorkflowTask['priority']) => void
  
  // Handoff
  createHandoff: (handoff: Omit<HandoffNotification, 'id' | 'timestamp' | 'read'>) => void
  markHandoffRead: (id: string) => void
  clearHandffs: () => void
  
  // Workflow execution flow
  advanceWorkflow: (instanceId: string) => void
  completeTask: (instanceId: string, taskId: string, notes?: string) => void
  
  // Getters
  getTasksByRole: (instanceId: string, role: string) => WorkflowTask[]
  getTasksByAgent: (agentId: string) => WorkflowTask[]
  getAllActiveTasks: () => WorkflowTask[]
  
  // Config reloading
  reloadWorkflows: () => void
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      workflowInstances: [],
      activeWorkflowId: null,
      handoffQueue: [],
      availableWorkflows: [],
      
      getWorkflowInstance: (id) => {
        return get().workflowInstances.find(w => w.id === id)
      },
      
      getActiveWorkflow: () => {
        const { workflowInstances, activeWorkflowId } = get()
        if (activeWorkflowId) {
          return workflowInstances.find(w => w.id === activeWorkflowId)
        }
        return workflowInstances.find(w => w.status === 'active')
      },
      
      createWorkflowInstance: (workflowId, context) => {
        const instance = startWorkflow(workflowId, context)
        if (!instance) return ''
        
        set(state => ({
          workflowInstances: [...state.workflowInstances, instance],
          activeWorkflowId: instance.id,
        }))
        
        return instance.id
      },
      
      cancelWorkflowInstance: (id) => {
        set(state => ({
          workflowInstances: state.workflowInstances.map(w => 
            w.id === id 
              ? { ...w, status: 'cancelled' as const, updatedAt: new Date().toISOString() }
              : w
          ),
        }))
      },
      
      pauseWorkflowInstance: (id) => {
        set(state => ({
          workflowInstances: state.workflowInstances.map(w => 
            w.id === id 
              ? { ...w, status: 'paused' as const, updatedAt: new Date().toISOString() }
              : w
          ),
        }))
      },
      
      resumeWorkflowInstance: (id) => {
        set(state => ({
          workflowInstances: state.workflowInstances.map(w => 
            w.id === id 
              ? { ...w, status: 'active' as const, updatedAt: new Date().toISOString() }
              : w
          ),
        }))
      },
      
      updateTaskStatus: (instanceId, taskId, status) => {
        set(state => ({
          workflowInstances: state.workflowInstances.map(instance => {
            if (instance.id !== instanceId) return instance
            
            const newPhases = instance.phases.map(phase => ({
              ...phase,
              activities: phase.activities.map(task => 
                task.id === taskId 
                  ? { ...task, status, updatedAt: new Date().toISOString(),
                      ...(status === 'in_progress' && !task.startedAt ? { startedAt: new Date().toISOString() } : {}),
                      ...(status === 'completed' ? { completedAt: new Date().toISOString(), progress: 100 } : {})
                    }
                  : task
              ),
            }))
            
            const completedTasks = newPhases.reduce(
              (sum, p) => sum + p.activities.filter(a => a.status === 'completed').length,
              0
            )
            
            return {
              ...instance,
              phases: newPhases,
              completedTasks,
              progress: Math.round((completedTasks / instance.totalTasks) * 100),
              updatedAt: new Date().toISOString(),
            }
          }),
        }))
        
        // Check if workflow can advance
        get().advanceWorkflow(instanceId)
      },
      
      updateTaskChecklist: (instanceId, taskId, checklistItem, checked) => {
        set(state => ({
          workflowInstances: state.workflowInstances.map(instance => {
            if (instance.id !== instanceId) return instance
            
            const newPhases = instance.phases.map(phase => ({
              ...phase,
              activities: phase.activities.map(task => {
                if (task.id !== taskId) return task
                const updated = updateTaskChecklist(task, checklistItem, checked)
                return updated
              }),
            }))
            
            return {
              ...instance,
              phases: newPhases,
              updatedAt: new Date().toISOString(),
            }
          }),
        }))
        
        // Check if task is now complete
        const instance = get().getWorkflowInstance(instanceId)
        const task = instance?.phases.flatMap(p => p.activities).find(t => t.id === taskId)
        if (task && task.checklist.every(item => task.checklistStatus[item])) {
          get().completeTask(instanceId, taskId)
        }
      },
      
      assignTask: (instanceId, taskId, agentId) => {
        set(state => ({
          workflowInstances: state.workflowInstances.map(instance => {
            if (instance.id !== instanceId) return instance
            
            const newPhases = instance.phases.map(phase => ({
              ...phase,
              activities: phase.activities.map(task => 
                task.id === taskId 
                  ? { ...task, agentId, updatedAt: new Date().toISOString() }
                  : task
              ),
            }))
            
            return {
              ...instance,
              phases: newPhases,
              updatedAt: new Date().toISOString(),
            }
          }),
        }))
      },
      
      setTaskPriority: (instanceId, taskId, priority) => {
        set(state => ({
          workflowInstances: state.workflowInstances.map(instance => {
            if (instance.id !== instanceId) return instance
            
            const newPhases = instance.phases.map(phase => ({
              ...phase,
              activities: phase.activities.map(task => 
                task.id === taskId 
                  ? { ...task, priority, updatedAt: new Date().toISOString() }
                  : task
              ),
            }))
            
            return {
              ...instance,
              phases: newPhases,
              updatedAt: new Date().toISOString(),
            }
          }),
        }))
      },
      
      createHandoff: (handoff) => {
        const newHandoff: HandoffNotification = {
          ...handoff,
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          read: false,
        }
        
        set(state => ({
          handoffQueue: [newHandoff, ...state.handoffQueue],
        }))
      },
      
      markHandoffRead: (id) => {
        set(state => ({
          handoffQueue: state.handoffQueue.map(h => 
            h.id === id ? { ...h, read: true } : h
          ),
        }))
      },
      
      clearHandffs: () => {
        set({ handoffQueue: [] })
      },
      
      advanceWorkflow: (instanceId) => {
        const instance = get().getWorkflowInstance(instanceId)
        if (!instance || instance.status !== 'active') return
        
        const updated = unlockNextPhase(instance)
        
        if (updated.id !== instance.id) {
          set(state => ({
            workflowInstances: state.workflowInstances.map(w => 
              w.id === instanceId ? updated : w
            ),
          }))
        }
      },
      
      completeTask: (instanceId, taskId, notes) => {
        // First update task status
        get().updateTaskStatus(instanceId, taskId, 'completed')
        
        // Find the task and check if it has outputs that need handoff
        const instance = get().getWorkflowInstance(instanceId)
        const task = instance?.phases.flatMap(p => p.activities).find(t => t.id === taskId)
        
        if (task && task.outputs.length > 0) {
          // Find the next role that receives this output
          const currentPhase = instance?.phases.find(p => 
            p.activities.some(a => a.id === taskId)
          )
          
          if (currentPhase) {
            const nextPhaseIndex = instance!.phases.findIndex(p => p.id === currentPhase.id) + 1
            const nextPhase = instance?.phases[nextPhaseIndex]
            
            if (nextPhase && nextPhase.status === 'active') {
              // Create handoff notification
              const nextTask = nextPhase.activities[0]
              if (nextTask) {
                get().createHandoff({
                  fromAgentId: task.agentId || 'system',
                  fromAgentName: task.assignedRoleName,
                  toRole: nextTask.assignedRole,
                  taskId: task.id,
                  taskName: task.activityName,
                  message: `Handoff: ${task.outputs.join(', ')} ready for ${nextTask.assignedRoleName}`,
                })
              }
            }
          }
        }
        
        // Advance workflow if possible
        get().advanceWorkflow(instanceId)
      },
      
      getTasksByRole: (instanceId, role) => {
        const instance = get().getWorkflowInstance(instanceId)
        if (!instance) return []
        
        return instance.phases
          .flatMap(p => p.activities)
          .filter(t => t.assignedRole === role)
      },
      
      getTasksByAgent: (agentId) => {
        const { workflowInstances } = get()
        return workflowInstances
          .flatMap(w => w.phases.flatMap(p => p.activities))
          .filter(t => t.agentId === agentId && t.status !== 'completed' && t.status !== 'cancelled')
      },
      
      getAllActiveTasks: () => {
        const { workflowInstances } = get()
        const allTasks = workflowInstances
          .filter(w => w.status === 'active')
          .flatMap(w => w.phases.flatMap(p => p.activities))
          .filter(t => t.status === 'queued' || t.status === 'in_progress')
        
        return sortTasks(allTasks)
      },
      
      reloadWorkflows: () => {
        const workflows = get().availableWorkflows
        // This will be called to refresh workflow definitions from config
        set({ availableWorkflows: [...workflows] })
      },
    }),
    {
      name: 'workflow-store',
      version: 1,
      partialize: (state) => ({
        workflowInstances: state.workflowInstances,
        activeWorkflowId: state.activeWorkflowId,
        handoffQueue: state.handoffQueue,
      }),
    }
  )
)
