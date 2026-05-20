'use client'

/**
 * QuestsPanel — gamification overview (Batch W Phase 3).
 *
 * Three sections:
 *   • Score breakdown (capacity / productivity / aesthetic) with tips.
 *   • Daily quests with live progress and reward.
 *   • Level + XP bar.
 *
 * Quests refresh every 24h on load (refreshDailyQuests is idempotent inside
 * the window). Completed quests stay visible until refresh so the user can
 * see what they earned that day.
 */

import React, { useMemo } from 'react'

import type { OfficeLayout } from '@/lib/office-types'
import { levelFromXp } from '@/lib/office-types'
import { computeOfficeScore } from '@/lib/office-gamification'

interface Props {
  layout: OfficeLayout
  agentCount: number
  completedTasksLast24h: number
}

export function QuestsPanel({ layout, agentCount, completedTasksLast24h }: Props) {
  const score = useMemo(
    () => computeOfficeScore({ layout, agentCount, completedTasksLast24h }),
    [layout, agentCount, completedTasksLast24h]
  )
  const xp = layout.gamification?.xp || 0
  const lvl = useMemo(() => levelFromXp(xp), [xp])
  const quests = layout.gamification?.dailyQuests || []
  const xpPercent = lvl.nextLevelXp > 0 ? Math.round((lvl.intoLevelXp / lvl.nextLevelXp) * 100) : 0

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#0f1117] text-white">
      <div className="px-6 py-4 border-b border-white/10">
        <h2 className="text-lg font-semibold">Quests &amp; Score</h2>
        <p className="text-xs text-white/40 mt-0.5">
          Build out the office to lift your score. Quests refresh daily and grant XP. Completed tasks also earn XP automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-6">
        {/* Level + Score */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/40 mb-3">Office level</p>
          <div className="flex items-end gap-3">
            <span className="text-5xl font-bold leading-none">{lvl.level}</span>
            <div className="flex-1 pb-1">
              <p className="text-xs text-white/60 mb-1">{xp} XP total</p>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-[width] duration-700"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-white/40 mt-1">{lvl.intoLevelXp} / {lvl.nextLevelXp} XP to level {lvl.level + 1}</p>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/40">Office score</p>
              <span className="text-xs text-white/70">{score.label}</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">{score.total}</span>
              <span className="text-xs text-white/40 pb-1">/ 100</span>
            </div>
            <div className="mt-3 space-y-2 text-[11px]">
              <ScoreRow label="Capacity" value={score.capacity} />
              <ScoreRow label="Productivity" value={score.productivity} />
              <ScoreRow label="Aesthetic" value={score.aesthetic} />
            </div>
          </div>
        </div>

        {/* Quests */}
        <div className="lg:col-span-2 space-y-3">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/40">Today&apos;s quests</p>
          {quests.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-center">
              <p className="text-sm text-white/60">No quests yet — they roll in automatically each day.</p>
            </div>
          )}
          {quests.map((q) => {
            const progress = q.progress || 0
            const pct = Math.min(100, Math.round((progress / q.target) * 100))
            const done = !!q.completedAt
            return (
              <div
                key={q.id}
                className={`rounded-xl border p-4 ${
                  done
                    ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
                    : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      done ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/60'
                    }`}
                  >
                    {done ? '✓' : '·'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-white">{q.title}</p>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-yellow-300/80">+{q.reward} XP</span>
                    </div>
                    <p className="text-xs text-white/50 mt-0.5">{q.description}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full transition-[width] duration-500 ${done ? 'bg-emerald-400' : 'bg-indigo-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-white/60 tabular-nums">{progress} / {q.target}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tips */}
      {score.tips.length > 0 && (
        <div className="mx-6 mb-6 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/40 mb-2">Ways to raise the score</p>
          <ul className="space-y-1.5">
            {score.tips.map((tip, i) => (
              <li key={i} className="text-xs text-white/70 flex items-start gap-2">
                <span className="text-indigo-300/80 mt-0.5">→</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-white/50">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-cyan-400 to-indigo-400 transition-[width] duration-700" style={{ width: `${value}%` }} />
      </div>
      <span className="w-7 text-right text-white/60 tabular-nums">{value}</span>
    </div>
  )
}
