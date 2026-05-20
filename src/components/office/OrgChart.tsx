'use client'

/**
 * OrgChart — Organization tab of the Office page (Batch W Phase 2).
 *
 * Lets the user define departments, assign agents to them, set department
 * leads, and draw reporting lines (who reports to whom). The data lives in
 * layout.org which is persisted as part of the office_layouts JSONB blob.
 *
 * UI approach: two columns. Left column lists departments with member
 * chips inline. Right column lists "Unassigned" agents — drag/click to
 * assign. Each department row exposes:
 *   • Edit name + color
 *   • Pick lead (dropdown of members)
 *   • Remove dept (members move back to Unassigned)
 *
 * Below the columns is the Reporting Lines table — pick agent + manager
 * pairs. Lines are advisory: they don't change the runtime but feed into
 * agent prompts (Phase 4) and the gamification quests.
 */

import React, { useMemo, useState } from 'react'

import type { OfficeDepartment, OfficeOrgStructure, ReportingLine } from '@/lib/office-types'

interface AgentSummary {
  id: string
  name: string
  role?: string | null
  color?: string | null
}

interface Props {
  org: OfficeOrgStructure | undefined
  agents: AgentSummary[]
  onChange: (next: OfficeOrgStructure) => void
}

const DEFAULT_COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#fb7185', '#22d3ee']

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}

export function OrgChart({ org, agents, onChange }: Props) {
  const safeOrg: OfficeOrgStructure = useMemo(
    () => org || { departments: [], reportingLines: [] },
    [org]
  )
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')

  const assignedAgentIds = useMemo(() => {
    const set = new Set<string>()
    for (const d of safeOrg.departments) for (const aid of d.agentIds) set.add(aid)
    return set
  }, [safeOrg.departments])

  const unassigned = agents.filter((a) => !assignedAgentIds.has(a.id))

  function pushChange(patch: Partial<OfficeOrgStructure>) {
    onChange({ ...safeOrg, ...patch })
  }

  function addDepartment() {
    const dept: OfficeDepartment = {
      id: newId('dept'),
      name: 'New Department',
      color: DEFAULT_COLORS[safeOrg.departments.length % DEFAULT_COLORS.length],
      agentIds: [],
    }
    pushChange({ departments: [...safeOrg.departments, dept] })
    setEditingDeptId(dept.id)
    setDraftName(dept.name)
  }

  function updateDept(id: string, patch: Partial<OfficeDepartment>) {
    pushChange({
      departments: safeOrg.departments.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    })
  }

  function removeDept(id: string) {
    pushChange({
      departments: safeOrg.departments.filter((d) => d.id !== id),
      // Drop reporting lines that point at members of the deleted dept.
      reportingLines: safeOrg.reportingLines,
    })
  }

  function moveAgentToDept(agentId: string, deptId: string | null) {
    // Remove from all current depts first.
    const stripped = safeOrg.departments.map((d) => ({
      ...d,
      agentIds: d.agentIds.filter((id) => id !== agentId),
      leadAgentId: d.leadAgentId === agentId ? undefined : d.leadAgentId,
    }))
    if (deptId === null) {
      pushChange({ departments: stripped })
    } else {
      pushChange({
        departments: stripped.map((d) => (d.id === deptId ? { ...d, agentIds: [...d.agentIds, agentId] } : d)),
      })
    }
  }

  function setReportingLine(agentId: string, managerId: string | '') {
    const remaining = safeOrg.reportingLines.filter((r) => r.agentId !== agentId)
    if (managerId && managerId !== agentId) {
      const next: ReportingLine = { agentId, managerId }
      pushChange({ reportingLines: [...remaining, next] })
    } else {
      pushChange({ reportingLines: remaining })
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#0f1117] text-white">
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Organization</h2>
          <p className="text-xs text-white/40 mt-0.5">
            Group agents into departments, set leads, define reporting lines. This shapes how Iris routes work and how agents introduce themselves.
          </p>
        </div>
        <button
          onClick={addDepartment}
          className="px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          + Department
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-6">
        {/* Departments */}
        <div className="lg:col-span-2 space-y-3">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/40">Departments</p>
          {safeOrg.departments.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center">
              <p className="text-sm text-white/60">No departments yet.</p>
              <p className="text-xs text-white/40 mt-1">Click "+ Department" to create your first team.</p>
            </div>
          )}
          {safeOrg.departments.map((dept) => (
            <div
              key={dept.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden"
              style={{ boxShadow: `inset 4px 0 0 0 ${dept.color}` }}
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                <div className="h-3 w-3 rounded-full" style={{ background: dept.color }} />
                {editingDeptId === dept.id ? (
                  <input
                    value={draftName}
                    autoFocus
                    onChange={(e) => setDraftName(e.target.value)}
                    onBlur={() => {
                      updateDept(dept.id, { name: draftName.trim() || dept.name })
                      setEditingDeptId(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                      if (e.key === 'Escape') setEditingDeptId(null)
                    }}
                    className="flex-1 bg-transparent border-b border-white/20 outline-none text-sm font-semibold text-white"
                  />
                ) : (
                  <button
                    onClick={() => { setEditingDeptId(dept.id); setDraftName(dept.name) }}
                    className="flex-1 text-left text-sm font-semibold text-white hover:text-indigo-300"
                  >
                    {dept.name}
                  </button>
                )}
                <select
                  value={dept.color}
                  onChange={(e) => updateDept(dept.id, { color: e.target.value })}
                  className="bg-white/[0.04] border border-white/10 rounded text-[10px] px-1 py-0.5 text-white/70"
                >
                  {DEFAULT_COLORS.map((c) => (
                    <option key={c} value={c} style={{ background: '#0f1117' }}>{c}</option>
                  ))}
                </select>
                <button
                  onClick={() => removeDept(dept.id)}
                  className="text-red-400/70 hover:text-red-300 text-xs px-2 py-0.5 rounded hover:bg-red-900/20"
                >
                  Remove
                </button>
              </div>
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-white/40">
                  <span>Members ({dept.agentIds.length})</span>
                  <span className="flex-1" />
                  <span>Lead:</span>
                  <select
                    value={dept.leadAgentId || ''}
                    onChange={(e) => updateDept(dept.id, { leadAgentId: e.target.value || undefined })}
                    className="bg-white/[0.04] border border-white/10 rounded text-[11px] px-1.5 py-0.5 text-white normal-case font-sans tracking-normal"
                  >
                    <option value="" style={{ background: '#0f1117' }}>— none —</option>
                    {dept.agentIds.map((aid) => {
                      const a = agents.find((x) => x.id === aid)
                      return (
                        <option key={aid} value={aid} style={{ background: '#0f1117' }}>
                          {a?.name || aid}
                        </option>
                      )
                    })}
                  </select>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {dept.agentIds.map((aid) => {
                    const a = agents.find((x) => x.id === aid)
                    if (!a) return null
                    const isLead = dept.leadAgentId === aid
                    return (
                      <div
                        key={aid}
                        className="group flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium border"
                        style={{
                          background: isLead ? `${dept.color}28` : 'rgba(255,255,255,0.04)',
                          borderColor: isLead ? `${dept.color}88` : 'rgba(255,255,255,0.1)',
                        }}
                      >
                        <span
                          className="h-3.5 w-3.5 rounded-full text-[8px] flex items-center justify-center text-white font-bold"
                          style={{ background: a.color || dept.color }}
                        >
                          {a.name.slice(0, 1).toUpperCase()}
                        </span>
                        <span>{a.name}</span>
                        {isLead && <span className="text-[9px] uppercase tracking-widest" style={{ color: dept.color }}>Lead</span>}
                        <button
                          onClick={() => moveAgentToDept(aid, null)}
                          className="text-white/40 hover:text-red-300 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove from department"
                        >
                          ×
                        </button>
                      </div>
                    )
                  })}
                  {dept.agentIds.length === 0 && (
                    <p className="text-[11px] text-white/30">No members yet. Drag from "Unassigned" or use the assign button.</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Unassigned */}
        <div className="space-y-3">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/40">Unassigned ({unassigned.length})</p>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] divide-y divide-white/5">
            {unassigned.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-white/40">All agents are assigned to a department.</p>
            )}
            {unassigned.map((a) => (
              <div key={a.id} className="px-3 py-2 flex items-center gap-2">
                <span
                  className="h-5 w-5 rounded-full text-[10px] flex items-center justify-center text-white font-bold"
                  style={{ background: a.color || '#64748b' }}
                >
                  {a.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{a.name}</p>
                  {a.role && <p className="text-[10px] text-white/40 truncate">{a.role}</p>}
                </div>
                {safeOrg.departments.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => e.target.value && moveAgentToDept(a.id, e.target.value)}
                    className="bg-white/[0.04] border border-white/10 rounded text-[10px] px-1.5 py-0.5 text-white/70"
                  >
                    <option value="" style={{ background: '#0f1117' }}>Assign to…</option>
                    {safeOrg.departments.map((d) => (
                      <option key={d.id} value={d.id} style={{ background: '#0f1117' }}>{d.name}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reporting lines */}
      <div className="px-6 pb-6">
        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/40 mb-2">Reporting lines</p>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] divide-y divide-white/5">
          {agents.length === 0 && (
            <p className="px-4 py-4 text-xs text-white/40">No agents yet.</p>
          )}
          {agents.map((a) => {
            const line = safeOrg.reportingLines.find((r) => r.agentId === a.id)
            return (
              <div key={a.id} className="px-4 py-2.5 flex items-center gap-3">
                <span
                  className="h-5 w-5 rounded-full text-[10px] flex items-center justify-center text-white font-bold"
                  style={{ background: a.color || '#64748b' }}
                >
                  {a.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="text-xs text-white flex-1">{a.name}</span>
                <span className="text-[10px] text-white/30">reports to</span>
                <select
                  value={line?.managerId || ''}
                  onChange={(e) => setReportingLine(a.id, e.target.value)}
                  className="bg-white/[0.04] border border-white/10 rounded text-xs px-2 py-1 text-white min-w-[160px]"
                >
                  <option value="" style={{ background: '#0f1117' }}>— no manager —</option>
                  {agents
                    .filter((m) => m.id !== a.id)
                    .map((m) => (
                      <option key={m.id} value={m.id} style={{ background: '#0f1117' }}>{m.name}</option>
                    ))}
                </select>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
