'use client'

import React, { useState } from 'react'
import { useAgentsStore } from '@/lib/agents-store'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Users,
  Bot,
  Wrench,
  GitBranch,
  Rocket,
  ChevronRight,
  X,
  CheckCircle,
  Sparkles,
} from 'lucide-react'

// ─── Step definitions ──────────────────────────────────────────────────────

const STEPS = [
  {
    id: 'company',
    icon: Building2,
    color: '#4f8ef7',
    title: 'Set up your agency',
    subtitle: 'Give your workspace a name so everything feels like yours.',
    action: 'Configure agency',
    href: '/settings',
  },
  {
    id: 'client',
    icon: Users,
    color: '#00d4aa',
    title: 'Add your first client',
    subtitle: 'Clients anchor every mission. Add one now so you can start assigning work.',
    action: 'Add a client',
    href: '/clients',
  },
  {
    id: 'agents',
    icon: Bot,
    color: '#a78bfa',
    title: 'Meet your agents',
    subtitle: 'Your AI team is ready. Explore who they are and what they specialise in.',
    action: 'View agents',
    href: '/agents',
  },
  {
    id: 'skills',
    icon: Wrench,
    color: '#fb923c',
    title: 'Add a skill',
    subtitle: 'Skills define what your agents can do. Add at least one to unlock full capability.',
    action: 'Manage skills',
    href: '/skills',
  },
  {
    id: 'pipeline',
    icon: GitBranch,
    color: '#38bdf8',
    title: 'Create a pipeline',
    subtitle: 'Pipelines wire agents together into repeatable workflows for any kind of work.',
    action: 'Build pipeline',
    href: '/pipeline',
  },
  {
    id: 'mission',
    icon: Rocket,
    color: '#f472b6',
    title: 'Start your first mission',
    subtitle: "You're ready. Brief Iris on what you need and watch the team deliver.",
    action: 'Start a mission',
    href: '/mission',
  },
]

// ─── Step detail content ───────────────────────────────────────────────────

const STEP_DETAILS: Record<string, { bullets: string[]; tip: string }> = {
  company: {
    bullets: [
      'Your agency name appears across the dashboard and in deliverables',
      'You can add a logo and brand colours in Settings at any time',
      'Theme and AI provider preferences live here too',
    ],
    tip: 'Most teams spend 2 minutes here and never need to come back.',
  },
  client: {
    bullets: [
      'Each client gets their own brand kit, brief history, and contact info',
      'Missions and deliverables are always tied to a client for clean reporting',
      'You can import multiple clients via CSV later',
    ],
    tip: "Even if you're solo, create a client — it keeps missions organised.",
  },
  agents: {
    bullets: [
      'Iris is your orchestrator — she routes work to the right specialist',
      'Each agent has a defined specialty, division, and set of tools',
      "You can customise any agent's persona, prompt, and AI model",
    ],
    tip: "Start by reading each agent's bio. It helps you brief them better.",
  },
  skills: {
    bullets: [
      'Skills are reusable capabilities that agents draw on when executing tasks',
      'Examples: SEO audit, content calendar, performance report',
      'Skills can be shared across agents or locked to a specific specialist',
    ],
    tip: 'Add skills that match the deliverables you produce most often.',
  },
  pipeline: {
    bullets: [
      'A pipeline is a sequence of agent handoffs — e.g. Research → Copy → Review',
      'Pipelines save you from rebuilding workflows every time a mission starts',
      'You can run a pipeline manually or trigger it on a schedule',
    ],
    tip: 'Create one pipeline for your most common request type first.',
  },
  mission: {
    bullets: [
      "Tell Iris what you need in plain language — she'll handle the rest",
      'You can target a specific client, assign agents, and set a deadline',
      'All deliverables land in the Output tab, ready to export or refine',
    ],
    tip: 'Try: "Write a content calendar for [Client] for next month."',
  },
}

// ─── Component ────────────────────────────────────────────────────────────

export function OnboardingWizard() {
  const updateAgencySettings = useAgentsStore((state) => state.updateAgencySettings)
  const agencySettings = useAgentsStore((state) => state.agencySettings)
  const router = useRouter()

  const [step, setStep] = useState(agencySettings.onboardingStep ?? 0)
  const [completing, setCompleting] = useState(false)

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const progress = ((step) / (STEPS.length - 1)) * 100

  function dismiss() {
    updateAgencySettings({ onboardingComplete: true, onboardingStep: step })
  }

  function handleNext() {
    if (isLast) {
      setCompleting(true)
      setTimeout(() => {
        updateAgencySettings({ onboardingComplete: true, onboardingStep: STEPS.length })
        router.push('/mission')
      }, 400)
      return
    }
    const next = step + 1
    setStep(next)
    updateAgencySettings({ onboardingStep: next })
  }

  function handleGoTo(idx: number) {
    setStep(idx)
    updateAgencySettings({ onboardingStep: idx })
  }

  function handleAction() {
    updateAgencySettings({ onboardingComplete: true, onboardingStep: step })
    router.push(current.href)
  }

  const Icon = current.icon
  const details = STEP_DETAILS[current.id]

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(10, 12, 20, 0.82)', backdropFilter: 'blur(12px)' }}
    >
      <div
        className="relative w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)' }}
      >
        {/* Top gradient accent */}
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl"
          style={{ background: `linear-gradient(90deg, ${current.color}, ${current.color}80)` }}
        />

        {/* Dismiss */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 p-2 rounded-xl text-[var(--text-dim)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-base)] transition-all"
          aria-label="Skip onboarding"
        >
          <X size={16} />
        </button>

        <div className="p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div
              className="flex h-6 items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold uppercase tracking-widest"
              style={{ background: `${current.color}18`, color: current.color, border: `1px solid ${current.color}30` }}
            >
              <Sparkles size={10} />
              Getting started
            </div>
            <span className="text-xs text-[var(--text-dim)] font-mono">
              Step {step + 1} of {STEPS.length}
            </span>
          </div>

          {/* Main content */}
          <div className="grid gap-8 md:grid-cols-[1fr_1.1fr]">

            {/* Left: step nav */}
            <div className="flex flex-col gap-2">
              {STEPS.map((s, idx) => {
                const SIcon = s.icon
                const isActive = idx === step
                const isDone = idx < step
                return (
                  <button
                    key={s.id}
                    onClick={() => handleGoTo(idx)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                      isActive
                        ? 'bg-white/8 border'
                        : isDone
                        ? 'opacity-70 hover:opacity-100 hover:bg-white/4'
                        : 'opacity-40 hover:opacity-60 hover:bg-white/4'
                    }`}
                    style={isActive ? { borderColor: `${s.color}40` } : { border: '1px solid transparent' }}
                  >
                    <div
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                      style={{
                        background: isDone ? `${s.color}20` : isActive ? `${s.color}18` : 'var(--bg-base)',
                        border: `1px solid ${isDone || isActive ? s.color + '35' : 'var(--border)'}`,
                      }}
                    >
                      {isDone ? (
                        <CheckCircle size={14} style={{ color: s.color }} />
                      ) : (
                        <SIcon size={14} style={{ color: isActive ? s.color : 'var(--text-dim)' }} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p
                        className="text-sm font-semibold leading-tight truncate"
                        style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                      >
                        {s.title}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Right: detail panel */}
            <div className="flex flex-col justify-between gap-6">
              <div>
                {/* Icon + headline */}
                <div className="mb-5 flex items-start gap-4">
                  <div
                    className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl"
                    style={{
                      background: `${current.color}15`,
                      border: `1.5px solid ${current.color}35`,
                      boxShadow: `0 8px 24px ${current.color}20`,
                    }}
                  >
                    <Icon size={26} style={{ color: current.color }} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-[-0.03em] text-[var(--text-primary)] leading-tight">
                      {current.title}
                    </h2>
                    <p className="mt-1.5 text-sm text-[var(--text-secondary)] leading-relaxed">
                      {current.subtitle}
                    </p>
                  </div>
                </div>

                {/* Bullets */}
                <ul className="space-y-2.5 mb-4">
                  {details.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <div
                        className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full"
                        style={{ background: current.color }}
                      />
                      <span className="text-sm text-[var(--text-secondary)] leading-relaxed">{b}</span>
                    </li>
                  ))}
                </ul>

                {/* Tip */}
                <div
                  className="rounded-xl px-3.5 py-2.5 text-xs leading-relaxed"
                  style={{ background: `${current.color}10`, color: current.color, border: `1px solid ${current.color}25` }}
                >
                  💡 {details.tip}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleAction}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-95 shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${current.color}, ${current.color}cc)`,
                    boxShadow: `0 8px 20px ${current.color}30`,
                  }}
                >
                  {current.action}
                  <ChevronRight size={15} />
                </button>
                <button
                  onClick={handleNext}
                  disabled={completing}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium border transition-all hover:bg-white/6 disabled:opacity-50"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                >
                  {isLast ? (completing ? 'Launching…' : 'Finish & launch →') : 'Next step →'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 w-full bg-white/6">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: current.color }}
          />
        </div>
      </div>
    </div>
  )
}
