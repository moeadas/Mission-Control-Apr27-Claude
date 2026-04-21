'use client'

import React from 'react'
import { Award, Crown, Sparkles } from 'lucide-react'

import { AgentBot } from '@/components/agents/AgentBot'
import { LeaderboardEntry } from '@/lib/live-ops'
import { clsx } from 'clsx'

export function AgentLeaderboardPanel({
  entries,
  title = 'Agent Leaderboard',
  subtitle = 'Recent performance based on completed tasks, lead wins, and support contributions.',
  compact = false,
}: {
  entries: LeaderboardEntry[]
  title?: string
  subtitle?: string
  compact?: boolean
}) {
  const topEntries = compact ? entries.slice(0, 3) : entries.slice(0, 6)

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <Award size={16} className="text-[var(--accent-blue)]" />
            {title}
          </h3>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{subtitle}</p>
        </div>
        {entries[0] ? (
          <div className="rounded-full border border-[rgba(79,142,247,0.24)] bg-[rgba(79,142,247,0.08)] px-3 py-1 text-[11px] font-mono uppercase tracking-[0.16em] text-[var(--accent-blue)]">
            Agent of the {compact ? 'Week' : 'Moment'}
          </div>
        ) : null}
      </div>

      <div className="mt-5 space-y-3">
        {topEntries.map((entry, index) => (
          <div
            key={entry.agentId}
            className={clsx(
              'flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors',
              index === 0
                ? 'border-[rgba(79,142,247,0.26)] bg-[linear-gradient(135deg,rgba(79,142,247,0.08),rgba(79,142,247,0.02))]'
                : 'border-[var(--border)] bg-[var(--bg-elevated)]'
            )}
          >
            <div
              className={clsx(
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-black',
                index === 0
                  ? 'bg-[rgba(79,142,247,0.15)] text-[var(--accent-blue)]'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)]'
              )}
            >
              {index === 0 ? <Crown size={14} /> : index + 1}
            </div>
            <AgentBot
              name={entry.agentName}
              avatar={entry.avatar || 'bot-blue'}
              photoUrl={entry.photoUrl}
              color={entry.color}
              size={compact ? 34 : 38}
              status="active"
              animation={index === 0 ? 'thinking' : 'idle'}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{entry.agentName}</p>
              <p className="text-xs text-[var(--text-secondary)]">
                {entry.tasksCompleted} completed · {entry.leadWins} lead · {entry.supportWins} support
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{entry.score}</p>
              <p className="inline-flex items-center gap-1 text-[11px] text-[var(--accent-green)]">
                <Sparkles size={10} />
                {entry.currentHotStreak} recent
              </p>
            </div>
          </div>
        ))}

        {!topEntries.length ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] px-4 py-5 text-sm text-[var(--text-secondary)]">
            Leaderboard will light up as the team completes more real tasks.
          </div>
        ) : null}
      </div>
    </div>
  )
}
