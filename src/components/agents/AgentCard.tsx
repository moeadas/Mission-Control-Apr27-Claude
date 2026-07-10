'use client'

import React from 'react'
import { Pencil } from 'lucide-react'

import { Agent } from '@/lib/types'
import { AgentBot } from './AgentBot'
import { DIVISION_LABELS } from '@/lib/bot-animations'
import { useAgentsStore } from '@/lib/agents-store'
import { formatCost, formatTokens } from '@/config/model-pricing'

const STATUS_CONFIG = {
  active: { label: 'Active', color: '#00d4aa' },
  idle: { label: 'Idle', color: '#ffd166' },
  paused: { label: 'Paused', color: '#555b73' },
}

const DEPARTMENT_LABELS: Record<string, string> = {
  marketing: 'Marketing',
  'accounting-finance': 'Accounting & Finance',
  'human-resources': 'People & HR',
  'business-development': 'Business Development',
}

interface AgentUsage {
  totalTokens: number
  totalCostUsd: number
  runCount: number
}

interface AgentCardProps {
  agent: Agent
  onEdit?: () => void
  tokenUsage?: AgentUsage
}

export function AgentCard({ agent, onEdit, tokenUsage }: AgentCardProps) {
  const missions = useAgentsStore((state) => state.missions)
  const artifacts = useAgentsStore((state) => state.artifacts)
  const accentStrong = agent.color
  const completedMissionIds = new Set<string>()

  for (const mission of missions) {
    const assignedAgentIds = Array.isArray(mission.assignedAgentIds) ? mission.assignedAgentIds : []
    const agentWasAssigned = mission.leadAgentId === agent.id || assignedAgentIds.includes(agent.id)
    const missionHasFinishedStatus = ['completed', 'review'].includes(mission.status)

    if (agentWasAssigned && missionHasFinishedStatus) {
      completedMissionIds.add(mission.id)
    }
  }

  for (const artifact of artifacts) {
    if (!artifact.missionId) continue
    const agentWasPrimary = artifact.agentId === agent.id
    const agentWorkedExecution = Array.isArray(artifact.executionSteps)
      ? artifact.executionSteps.some((step) => step.agentId === agent.id && step.status !== 'failed')
      : false

    if (agentWasPrimary || agentWorkedExecution) {
      completedMissionIds.add(artifact.missionId)
    }
  }

  const completedTasksCount = completedMissionIds.size
  const divisionLabel = DIVISION_LABELS[agent.division] || `${agent.division.replace(/-/g, ' ')} Division`
  const gradientBackground = `linear-gradient(180deg, color-mix(in srgb, ${accentStrong} 74%, white 26%) 0%, color-mix(in srgb, ${accentStrong} 88%, #334155 12%) 56%, color-mix(in srgb, ${accentStrong} 64%, #0f172a 36%) 100%)`

  return (
    <article
      className="group relative overflow-hidden rounded-[32px] p-[1px] transition-all duration-200 hover:-translate-y-1"
      style={{
        background: `linear-gradient(180deg, color-mix(in srgb, ${agent.color} 42%, white 58%) 0%, color-mix(in srgb, ${agent.color} 14%, #ffffff 86%) 100%)`,
        boxShadow: '0 24px 44px rgba(45,78,135,0.14)',
      }}
    >
      <div
        className="relative flex h-full min-h-[430px] flex-col rounded-[31px] p-4"
        style={{
          background: gradientBackground,
        }}
      >
        <div className="absolute inset-x-0 top-0 h-[54%] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.34),transparent_48%)]" />
        <div className="absolute inset-x-[12%] bottom-[24%] h-24 rounded-full bg-black/10 blur-2xl" />
        <div className="relative flex h-full flex-col">
          <div className="flex items-start justify-between">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-2.5 py-1 text-[10px] font-mono text-white/80 backdrop-blur-sm">
              <span className="text-[#00d4aa]">$</span>
              {tokenUsage ? formatCost(tokenUsage.totalCostUsd).replace('$', '') : '0.00'}
              <span className="text-white/50">·</span>
              {tokenUsage ? formatTokens(tokenUsage.totalTokens) : '0'}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/18 px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-white/90 backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-white/80 shadow-[0_0_10px_rgba(255,255,255,0.6)]" />
              {completedTasksCount} completed
            </div>
          </div>

          <div className="relative flex flex-1 items-center justify-center pb-0 pt-0">
            <AgentBot
              name={agent.name}
              avatar={agent.avatar}
              color={agent.color}
              photoUrl={agent.photoUrl}
              status={agent.status}
              animation={agent.status === 'active' && agent.currentTask ? 'working' : 'idle'}
              size={242}
            />
          </div>

          <div className="mt-auto px-5 pb-5 pt-3 text-center">
            <h3 className="truncate text-2xl font-black tracking-[-0.03em] text-white">{agent.name}</h3>
            <p className="mt-1 line-clamp-2 text-sm italic leading-6 text-white">{agent.role}</p>
            <p className="mt-1 text-sm font-semibold text-white">{DEPARTMENT_LABELS[agent.department || 'marketing'] || divisionLabel}</p>
            {agent.model && (
              <p className="mt-1 text-[10px] text-white/60 font-mono">{agent.model}</p>
            )}

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onEdit?.()
              }}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[18px] border border-white/24 bg-white/16 px-4 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/22"
            >
              <Pencil size={14} />
              Edit
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
