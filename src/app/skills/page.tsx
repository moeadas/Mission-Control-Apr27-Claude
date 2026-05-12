'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { ClientShell } from '@/components/ClientShell'
import { SkillImporter } from '@/components/skills/SkillImporter'
import { SKILL_CATEGORIES, type Skill } from '@/lib/skill-schema'
import Link from 'next/link'
import { Plus, Search, BookOpen, Star, Edit, ListChecks, Workflow, Zap } from 'lucide-react'
import { clsx } from 'clsx'
import { getAuthToken } from '@/lib/auth/browser'

const CATEGORY_ALIASES: Record<string, string> = {
  'strategy & planning': 'strategy',
  'creative & copy': 'creative',
  'media & advertising': 'media',
  'research & analytics': 'research',
  'operations & workflow': 'operations',
  'client services': 'client-services',
  'content production': 'content',
}

function normalizeCategoryId(value?: string | null) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
  return CATEGORY_ALIASES[normalized] || normalized
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [showSkillPackages, setShowSkillPackages] = useState(false)

  const loadSkills = async () => {
    const token = await getAuthToken()
    const response = await fetch('/api/skills', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    return response.ok ? response.json() : []
  }

  const buildSearchableText = (skill: Skill) =>
    [
      skill.id,
      skill.name,
      skill.description,
      skill.category,
      ...(skill.agents || []),
      ...(skill.pipelines || []),
      ...((skill.metadata?.tags as string[] | undefined) || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

  useEffect(() => {
    setLoading(true)
    loadSkills()
      .then((data) => {
        if (Array.isArray(data)) {
          setSkills(data)
        } else {
          setSkills([])
        }
      })
      .catch(() => {
        setSkills([])
      })
      .finally(() => setLoading(false))
  }, [])

  const filteredSkills = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase()
    const tokens = normalizedQuery.split(/\s+/).filter(Boolean)

    return skills.filter((skill) => {
      const searchable = buildSearchableText(skill)
      const matchesQuery =
        tokens.length === 0 || tokens.every((token) => searchable.includes(token))
      const matchesCategory =
        !category || normalizeCategoryId(skill.category) === normalizeCategoryId(category)

      return matchesQuery && matchesCategory
    })
  }, [skills, search, category])

  const getCategoryColor = (catId: string) =>
    SKILL_CATEGORIES.find((c) => c.id === normalizeCategoryId(catId))?.color || '#666'

  const getCategoryName = (catId: string) =>
    SKILL_CATEGORIES.find((c) => c.id === normalizeCategoryId(catId))?.name || catId

  const difficultyColors = {
    beginner: { bg: 'rgba(0,212,170,0.1)', color: '#00d4aa', label: 'beginner' },
    intermediate: { bg: 'rgba(255,209,102,0.1)', color: '#ffd166', label: 'intermediate' },
    advanced: { bg: 'rgba(255,95,160,0.1)', color: '#ff5fa0', label: 'advanced' },
  }

  if (loading) {
    return (
      <ClientShell>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div
              className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
            >
              <div
                className="w-6 h-6 border-2 border-[#9b6dff] border-t-transparent rounded-full animate-spin"
              />
            </div>
            <p className="text-sm text-[var(--text-secondary)]">Loading skills...</p>
          </div>
        </div>
      </ClientShell>
    )
  }

  return (
    <ClientShell>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div
          className="px-6 py-5 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)' }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-heading font-bold text-[var(--text-primary)] flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(155,109,255,0.1))',
                    border: '1px solid rgba(245,158,11,0.3)',
                  }}
                >
                  <BookOpen size={18} style={{ color: '#f59e0b' }} />
                </div>
                Skills Library
              </h1>
              <p className="text-xs text-[var(--text-dim)] mt-1">
                {filteredSkills.length} of {skills.length} skills shown across {SKILL_CATEGORIES.length} categories
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSkillPackages((current) => !current)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))',
                boxShadow: '0 4px 12px rgba(155,109,255,0.3)',
              }}
            >
              <Plus size={16} />
              {showSkillPackages ? 'Close New Skill' : 'New Skill'}
            </button>
          </div>
        </div>

        {/* Search + Filters */}
        <div
          className="px-6 py-3 flex-shrink-0 space-y-3"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)' }}
        >
          {showSkillPackages ? (
            <div className="space-y-3">
              <SkillImporter
                            onImported={async () => {
                  const data = await loadSkills()
                  if (Array.isArray(data)) {
                    setSkills(data)
                  }
                }}
              />
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Create a skill from scratch</p>
                  <p className="text-xs text-[var(--text-dim)]">Use the dedicated editor if you want to author a new Mission Control-native skill manually.</p>
                </div>
                <Link
                  href="/skills/new"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
                  style={{ background: 'var(--accent-purple)' }}
                >
                  <Plus size={14} />
                  Create Skill
                </Link>
              </div>
            </div>
          ) : null}

          {/* Search */}
          <div className="relative max-w-md">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search skills by name, agent, pipeline..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] outline-none transition-all"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent-purple)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          {/* Category pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setCategory(null)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                !category
                  ? 'text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
              style={!category ? { background: 'var(--accent-purple)' } : { background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
            >
              All
            </button>
            {SKILL_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(category === cat.id ? null : cat.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={
                  category === cat.id
                    ? { background: cat.color + '20', color: cat.color, border: `1px solid ${cat.color}40` }
                    : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
                }
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: cat.color }}
                />
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Skills Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredSkills.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <Star size={36} style={{ color: 'var(--text-dim)' }} />
              </div>
              <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                {search.trim() || category ? 'No skills found' : 'No skills yet'}
              </h3>
              <p className="text-sm text-[var(--text-dim)] mb-4">
                {search.trim() || category
                  ? 'Try a different search term or filter'
                  : 'Create your first skill to get started'}
              </p>
              {!search.trim() && !category && (
                <Link
                  href="/skills/new"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
                  style={{ background: 'var(--accent-purple)' }}
                >
                  <Plus size={16} />
                  Create Skill
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
              {filteredSkills.map((skill, i) => {
                const catColor = getCategoryColor(skill.category)
                const diff = difficultyColors[skill.difficulty] || difficultyColors.beginner

                return (
                  <Link
                    key={`${skill.id}-${skill.name}-${normalizeCategoryId(skill.category)}`}
                    href={`/skills/${skill.id}`}
                    className="card-surface p-5 hover-lift group block transition-all duration-200"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex flex-wrap gap-1.5">
                        <span
                          className="badge"
                          style={{ background: catColor + '15', color: catColor }}
                        >
                          {getCategoryName(skill.category)}
                        </span>
                        <span
                          className="badge"
                          style={{ background: diff.bg, color: diff.color }}
                        >
                          {diff.label}
                        </span>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: 'var(--bg-elevated)' }}
                        >
                          <Edit size={13} style={{ color: 'var(--text-dim)' }} />
                        </div>
                      </div>
                    </div>

                    {/* Name */}
                    <h3 className="text-sm font-semibold mb-2 font-mono transition-colors duration-150" style={{ color: 'var(--text-primary)' }}>
                      {skill.name}
                    </h3>
                    <p className="text-xs text-[var(--text-dim)] line-clamp-2 leading-relaxed mb-4">
                      {skill.description}
                    </p>

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-3">
                      {skill.variables && skill.variables.length > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-[var(--text-dim)]">
                          <Zap size={11} />
                          <span className="font-mono">{skill.variables.length} vars</span>
                        </div>
                      )}
                      {skill.checklist && skill.checklist.length > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-[var(--text-dim)]">
                          <ListChecks size={11} />
                          <span className="font-mono">{skill.checklist.length} steps</span>
                        </div>
                      )}
                      {skill.workflow?.steps && skill.workflow.steps.length > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-[var(--text-dim)]">
                          <Workflow size={11} />
                          <span className="font-mono">{skill.workflow.steps.length} tasks</span>
                        </div>
                      )}
                    </div>

                    {/* Footer arrow */}
                    <div className="mt-4 pt-3 flex items-center justify-end" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <span className="text-[10px] font-mono text-[var(--accent-purple)] opacity-0 group-hover:opacity-100 transition-opacity">
                        Edit →
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer tip */}
        <div
          className="px-6 py-3 flex-shrink-0 flex items-center gap-2"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-panel)' }}
        >
          <Star size={12} style={{ color: '#ffd166' }} />
          <p className="text-[11px] text-[var(--text-dim)]">
            <strong className="text-[var(--text-secondary)]">Best practice:</strong> Skills should be concise, have clear verification checklists, and progressive disclosure.
          </p>
        </div>
      </div>
    </ClientShell>
  )
}
