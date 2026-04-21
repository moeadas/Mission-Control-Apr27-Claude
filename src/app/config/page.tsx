'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClientShell } from '@/components/ClientShell'
import { BookOpen, Layers, Wrench, FileText, Shield, ExternalLink, ArrowRight } from 'lucide-react'

const CONFIG_SECTIONS = [
  {
    id: 'skills',
    name: 'Skills Library',
    description: 'Browse, create, and edit individual skills. Each skill has prompts (en/ar), variables, inputs/outputs, and checklists.',
    href: '/skills',
    icon: BookOpen,
    color: '#a78bfa',
    badge: 'Card-based editor',
    category: 'Workflows',
  },
  {
    id: 'pipelines',
    name: 'Pipeline Library',
    description: 'Browse, create, and edit individual pipelines. Each pipeline has phases, activities, client profile fields, and execution prompts.',
    href: '/pipeline',
    icon: Layers,
    color: '#4f8ef7',
    badge: 'Card-based editor',
    category: 'Workflows',
  },
  {
    id: 'agent-roles',
    name: 'Agent Roles',
    description: 'Configure each agent through a dedicated architecture folder with core config, soul, rules, memory, handoffs, and skill selection.',
    file: 'src/config/agents/<agent-id>/',
    icon: Wrench,
    color: '#00d4aa',
    badge: 'Folder architecture',
    category: 'Agents & Tools',
  },
  {
    id: 'tools',
    name: 'Tool Integrations',
    description: 'Manage external tool integrations and API connections.',
    file: 'src/config/tools/tools-config.json',
    icon: Wrench,
    color: '#f97316',
    badge: 'JSON editor',
    category: 'Agents & Tools',
  },
  {
    id: 'client-templates',
    name: 'Client Templates',
    description: 'Edit client onboarding and brief templates.',
    file: 'src/config/client-templates/client-templates.json',
    icon: FileText,
    color: '#38bdf8',
    badge: 'JSON editor',
    category: 'Templates',
  },
  {
    id: 'checkpoints',
    name: 'Quality Gates',
    description: 'Configure phase approval checkpoints and quality standards.',
    file: 'src/config/checkpoints/quality-checkpoints.json',
    icon: Shield,
    color: '#ffd166',
    badge: 'JSON editor',
    category: 'Templates',
  },
]

const CATEGORIES = [
  { id: 'Workflows', color: '#9b6dff' },
  { id: 'Agents & Tools', color: '#4f8ef7' },
  { id: 'Templates', color: '#00d4aa' },
]

export default function ConfigEditorPage() {
  const router = useRouter()

  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    items: CONFIG_SECTIONS.filter(s => s.category === cat.id),
  }))

  return (
    <ClientShell>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-5 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Agency Configuration</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
            Manage skills, pipelines, agents, tools, and templates
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {grouped.map(cat => (
            <div key={cat.id}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">{cat.id}</h2>
                <div className="flex-1 h-px bg-[#2a2d38]" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cat.items.map(section => {
                  const Icon = section.icon
                  return (
                    <button
                      key={section.id}
                      onClick={() => section.href ? router.push(section.href) : null}
                      disabled={!section.href}
                      className="p-5 bg-[#1a1d26] rounded-xl border border-[#2a2d38] hover:border-[#3a3d48] text-left transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: section.color + '20' }}
                        >
                          <Icon size={18} style={{ color: section.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-semibold transition-colors" style={{ color: 'var(--text-primary)' }}>
                              {section.name}
                            </h3>
                            {section.href && (
                              <ArrowRight size={14} className="text-gray-600 group-hover:text-accent-purple transition-colors" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                            {section.description}
                          </p>
                          <div className="flex items-center gap-2 mt-3">
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-mono"
                              style={{ backgroundColor: section.color + '15', color: section.color }}
                            >
                              {section.badge}
                            </span>
                            {section.file && (
                              <span className="text-[10px] text-gray-600 font-mono truncate">
                                {section.file}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ClientShell>
  )
}
