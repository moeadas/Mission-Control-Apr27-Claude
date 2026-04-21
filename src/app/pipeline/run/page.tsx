'use client'

import React, { useState, useEffect } from 'react'
import { ClientShell } from '@/components/ClientShell'
import { useAgentsStore } from '@/lib/agents-store'
import { SkillImporter } from '@/components/skills/SkillImporter'
import {
  Play,
  Pause,
  CheckCircle2,
  Circle,
  AlertCircle,
  ChevronRight,
  Zap,
  Globe,
  FileText,
  MessageSquare,
  Bot,
  Clock,
  Send,
  Loader2,
} from 'lucide-react'
import { clsx } from 'clsx'
import {
  routeTask,
  createPipelineInstance,
  validatePipelineClientData,
  type PipelineInstance,
  type PipelineTask,
} from '@/lib/pipeline-execution'
import type { Pipeline } from '@/lib/stores/pipelines-store'

export default function PipelineRunPage() {
  const agents = useAgentsStore(state => state.agents)
  const clients = useAgentsStore(state => state.clients)
  
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null)
  const [selectedClient, setSelectedClient] = useState(clients[0]?.id || '')
  const [language, setLanguage] = useState<'en' | 'ar'>('en')
  
  // Task request
  const [taskDescription, setTaskDescription] = useState('')
  const [routingResult, setRoutingResult] = useState<any>(null)
  const [isRouting, setIsRouting] = useState(false)
  
  // Active instances
  const [instances, setInstances] = useState<PipelineInstance[]>([])
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'run' | 'skills' | 'active'>('run')

  useEffect(() => {
    async function loadPipelines() {
      try {
        const modules = await import('@/config/pipelines/pipelines.json')
        setPipelines(modules.default.pipelines)
        if (modules.default.pipelines.length > 0) {
          setSelectedPipeline(modules.default.pipelines[0])
        }
      } catch (error) {
        console.error('Failed to load pipelines:', error)
      }
    }
    loadPipelines()
  }, [])

  const handleRouteTask = async () => {
    if (!taskDescription.trim()) return
    
    setIsRouting(true)
    setRoutingResult(null)
    
    try {
      const result = await routeTask(
        { description: taskDescription, clientId: selectedClient, language },
        pipelines
      )
      setRoutingResult(result)
    } catch (error) {
      setRoutingResult({
        success: false,
        message: `Error: ${error}`,
      })
    }
    
    setIsRouting(false)
  }

  const startPipeline = (pipelineId: string) => {
    const pipeline = pipelines.find(p => p.id === pipelineId)
    if (!pipeline) return

    const clientData = createPipelineInstance(pipeline, selectedClient, {}, language).clientData
    const validation = validatePipelineClientData(pipeline, clientData)
    if (!validation.ok) {
      setRoutingResult({
        success: false,
        message: validation.message,
        availablePipelines: [
          {
            id: pipeline.id,
            name: pipeline.name,
            description: [
              validation.missingFields.length ? `Missing required fields: ${validation.missingFields.join(', ')}` : '',
              validation.missingTemplateVariables.length
                ? `Missing template variables: ${validation.missingTemplateVariables.join(', ')}`
                : '',
            ]
              .filter(Boolean)
              .join(' • '),
            version: pipeline.version,
            phases: pipeline.phases.map(ph => ({ id: ph.id, name: ph.name })),
          },
        ],
      })
      return
    }
    
    const instance = createPipelineInstance(
      pipeline,
      selectedClient,
      clientData,
      language
    )
    setInstances(prev => [...prev, instance])
    setActiveTab('active')
    setRoutingResult(null)
    setTaskDescription('')
  }

  return (
    <ClientShell>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex-shrink-0">
          <h1 className="text-xl font-heading font-bold text-text-primary flex items-center gap-2">
            <Zap size={20} className="text-accent-purple" />
            Pipeline Runner
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Route tasks to pipelines, execute with AI agents, manage skills
          </p>
        </div>
        
        {/* Tabs */}
        <div className="px-6 border-b border-border flex gap-4 flex-shrink-0">
          <button
            onClick={() => setActiveTab('run')}
            className={clsx(
              'py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'run'
                ? 'border-accent-purple text-accent-purple'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            )}
          >
            <Send size={14} className="inline mr-1" /> Route Task
          </button>
          <button
            onClick={() => setActiveTab('skills')}
            className={clsx(
              'py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'skills'
                ? 'border-accent-purple text-accent-purple'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            )}
          >
            <FileText size={14} className="inline mr-1" /> Import Skills
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={clsx(
              'py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'active'
                ? 'border-accent-purple text-accent-purple'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            )}
          >
            <Clock size={14} className="inline mr-1" /> Active Pipelines
            {instances.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-accent-purple/20 text-accent-purple rounded-full text-xs">
                {instances.length}
              </span>
            )}
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Route Task Tab */}
          {activeTab === 'run' && (
            <div className="max-w-3xl space-y-6">
              {/* Task Input */}
              <div className="bg-base-200 rounded-xl p-6 space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <MessageSquare size={16} />
                  Describe the Task
                </h3>
                
                <textarea
                  value={taskDescription}
                  onChange={e => setTaskDescription(e.target.value)}
                  placeholder="e.g., 'Create a 30-day content calendar for my fitness brand targeting women 25-35 on Instagram and LinkedIn'"
                  className="w-full h-32 bg-base-300 rounded-lg p-4 text-sm resize-none outline-none focus:ring-2 focus:ring-accent-purple"
                />
                
                {/* Options */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Client</label>
                    <select
                      value={selectedClient}
                      onChange={e => setSelectedClient(e.target.value)}
                      className="w-full bg-base-300 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-purple"
                    >
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Language</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setLanguage('en')}
                        className={clsx(
                          'p-2 rounded-lg border text-center text-sm transition-all',
                          language === 'en'
                            ? 'bg-accent-purple/20 border-accent-purple ring-2 ring-accent-purple'
                            : 'bg-base-300 border-border hover:border-accent-purple'
                        )}
                      >
                        🇬🇧 English
                      </button>
                      <button
                        onClick={() => setLanguage('ar')}
                        className={clsx(
                          'p-2 rounded-lg border text-center text-sm transition-all',
                          language === 'ar'
                            ? 'bg-accent-purple/20 border-accent-purple ring-2 ring-accent-purple'
                            : 'bg-base-300 border-border hover:border-accent-purple'
                        )}
                      >
                        🇸🇦 العربية
                      </button>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={handleRouteTask}
                  disabled={!taskDescription.trim() || isRouting}
                  className={clsx(
                    'w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all',
                    !taskDescription.trim() || isRouting
                      ? 'bg-base-300 text-text-dim cursor-not-allowed'
                      : 'bg-accent-purple text-white hover:bg-accent-purple/80'
                  )}
                >
                  {isRouting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Routing...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Route to Pipeline
                    </>
                  )}
                </button>
              </div>
              
              {/* Routing Result */}
              {routingResult && (
                <div className={clsx(
                  'rounded-xl p-6 border',
                  routingResult.success
                    ? 'bg-accent-green/5 border-accent-green/20'
                    : 'bg-accent-red/5 border-accent-red/20'
                )}>
                  {routingResult.success ? (
                    <>
                      <div className="flex items-center gap-2 mb-4">
                        <CheckCircle2 size={20} className="text-accent-green" />
                        <h3 className="font-medium text-accent-green">{routingResult.message}</h3>
                      </div>
                      
                      <div className="bg-base-200 rounded-lg p-4 mb-4">
                        <p className="text-sm">
                          <span className="text-text-secondary">Pipeline:</span>{' '}
                          <span className="font-medium">{routingResult.pipelineName}</span>
                        </p>
                        <p className="text-xs text-text-dim mt-1">
                          {selectedPipeline?.description}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => startPipeline(routingResult.pipelineId)}
                        className="w-full py-3 bg-accent-green text-white rounded-lg font-medium hover:bg-accent-green/80 flex items-center justify-center gap-2"
                      >
                        <Play size={16} />
                        Start Pipeline: {routingResult.pipelineName}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-4">
                        <AlertCircle size={20} className="text-accent-red" />
                        <h3 className="font-medium text-accent-red">No Matching Pipeline</h3>
                      </div>
                      
                      <p className="text-sm text-text-secondary mb-4">
                        {routingResult.message}
                      </p>
                      
                      {routingResult.availablePipelines && (
                        <div>
                          <p className="text-sm font-medium mb-2">Available Pipelines:</p>
                          <div className="space-y-2">
                            {routingResult.availablePipelines.map((p: any) => (
                              <div key={p.id} className="bg-base-200 rounded-lg p-3">
                                <p className="font-medium text-sm">{p.name}</p>
                                <p className="text-xs text-text-secondary">{p.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Import Skills Tab */}
          {activeTab === 'skills' && (
            <div className="max-w-4xl">
              <SkillImporter />
            </div>
          )}
          
          {/* Active Pipelines Tab */}
          {activeTab === 'active' && (
            <div className="space-y-4">
              {instances.length === 0 ? (
                <div className="text-center py-20">
                  <Zap size={48} className="mx-auto text-text-dim mb-4" />
                  <p className="text-text-secondary">No active pipelines</p>
                  <p className="text-xs text-text-dim mt-1">
                    Route a task to start a pipeline
                  </p>
                </div>
              ) : (
                instances.map(instance => (
                  <div key={instance.id} className="bg-base-200 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-medium">{instance.pipelineId}</h3>
                        <p className="text-xs text-text-secondary">
                          Client: {instance.clientId} • Language: {instance.language}
                        </p>
                      </div>
                      <span className={clsx(
                        'px-3 py-1 rounded-full text-xs font-medium',
                        instance.status === 'running' ? 'bg-accent-green/20 text-accent-green' :
                        instance.status === 'pending' ? 'bg-accent-yellow/20 text-accent-yellow' :
                        'bg-base-300 text-text-secondary'
                      )}>
                        {instance.status}
                      </span>
                    </div>
                    
                    {/* Progress */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-text-secondary">Progress</span>
                        <span className="font-medium">
                          {instance.tasks.filter(t => t.status === 'completed').length}/
                          {instance.tasks.length}
                        </span>
                      </div>
                      <div className="h-2 bg-base-300 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent-purple transition-all"
                          style={{
                            width: `${(instance.tasks.filter(t => t.status === 'completed').length / instance.tasks.length) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* Tasks */}
                    <div className="space-y-2">
                      {instance.tasks.slice(0, 5).map(task => (
                        <div key={task.id} className="flex items-center gap-2 text-sm">
                          {task.status === 'completed' ? (
                            <CheckCircle2 size={16} className="text-accent-green" />
                          ) : task.status === 'in-progress' ? (
                            <Loader2 size={16} className="text-accent-purple animate-spin" />
                          ) : task.status === 'blocked' ? (
                            <AlertCircle size={16} className="text-accent-red" />
                          ) : (
                            <Circle size={16} className="text-text-dim" />
                          )}
                          <span className={task.status === 'completed' ? 'line-through opacity-60' : ''}>
                            {task.title}
                          </span>
                        </div>
                      ))}
                      {instance.tasks.length > 5 && (
                        <p className="text-xs text-text-dim">+{instance.tasks.length - 5} more tasks</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </ClientShell>
  )
}
