'use client'

import React from 'react'
import { useAgentsStore } from '@/lib/agents-store'
import { Card } from '@/components/ui/Card'
import { AgentBot } from '@/components/agents/AgentBot'
import { formatTimestamp } from '@/lib/bot-animations'
import { Clock, CheckCircle2, AlertCircle, Loader2, Zap } from 'lucide-react'

const ACTION_CONFIG = {
  started: {
    icon: <div className="w-2 h-2 rounded-full shadow-[0_0_6px_var(--color-started)]" style={{ background: 'var(--color-started)' }} />,
    color: 'var(--color-started)',
    label: 'started',
  },
  completed: {
    icon: <CheckCircle2 size={12} style={{ color: 'var(--color-completed)' }} />,
    color: 'var(--color-completed)',
    label: 'completed',
  },
  thinking: {
    icon: <Loader2 size={12} className="animate-spin" style={{ color: 'var(--color-thinking)' }} />,
    color: 'var(--color-thinking)',
    label: 'thinking',
  },
  error: {
    icon: <AlertCircle size={12} style={{ color: 'var(--color-error)' }} />,
    color: 'var(--color-error)',
    label: 'error',
  },
  idle: {
    icon: <div className="w-2 h-2 rounded-full" style={{ background: 'var(--text-dim)' }} />,
    color: 'var(--text-dim)',
    label: 'idle',
  },
}

export function ActivityFeed() {
  const activities = useAgentsStore((state) => state.activities)
  const agents = useAgentsStore((state) => state.agents)

  if (activities.length === 0) {
    return (
      <Card className="h-full">
        <div className="flex flex-col items-center justify-center h-full py-12">
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center">
              <Zap size={28} className="text-[var(--text-dim)]" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--accent-yellow)] opacity-60 animate-pulse" />
          </div>
          <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">No activity yet</p>
          <p className="text-xs text-[var(--text-dim)]">Agent actions will appear here in real time</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden p-0">
      <div className="flex-shrink-0 border-b border-[var(--border-subtle)] px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse shadow-[0_0_6px_var(--color-started)]" style={{ background: 'var(--color-started)' }} />
            <h3 className="hud-label">
              Live Activity
            </h3>
          </div>
          <span className="text-[10px] font-mono text-[var(--text-dim)]">
            {activities.length} events
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)]">
        {activities.slice(0, 20).map((entry, i) => {
          const config = ACTION_CONFIG[entry.type] || ACTION_CONFIG.idle
          const agent = agents.find((item) => item.id === entry.agentId)
          return (
            <div
              key={entry.id}
              className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-[var(--bg-elevated)]/50"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              {/* Avatar */}
              <div className="flex-shrink-0 mt-0.5">
                <AgentBot
                  name={entry.agentName}
                  avatar="bot-blue"
                  color={entry.agentColor}
                  photoUrl={agent?.photoUrl}
                  status="active"
                  size={30}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    {entry.agentName}
                  </span>
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded-full"
                    style={{
                      background: config.color + '20',
                      color: config.color,
                    }}
                  >
                    {config.label}
                  </span>
                  {entry.action && (
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      — {entry.action}
                    </span>
                  )}
                </div>
                {entry.detail && (
                  <p className="text-[11px] text-[var(--text-dim)] mt-0.5 truncate">
                    {entry.detail}
                  </p>
                )}
              </div>

              {/* Time + icon */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {config.icon}
                <span className="text-[10px] font-mono text-[var(--text-dim)]">
                  {formatTimestamp(entry.timestamp)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {activities.length > 20 && (
        <div className="px-5 py-2 border-t border-[var(--border-subtle)] flex-shrink-0">
          <p className="text-[10px] font-mono text-[var(--text-dim)] text-center">
            Showing 20 of {activities.length} events
          </p>
        </div>
      )}
    </Card>
  )
}
