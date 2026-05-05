'use client'

import React, { useCallback, useMemo, useRef, useState } from 'react'
import { Archive, CheckCircle2, AlertCircle, Upload, Loader2 } from 'lucide-react'

import { getSupabaseAccessToken } from '@/lib/auth/browser'

type ImportResult = {
  fileName: string
  status: 'success' | 'error'
  message: string
}

type SkillImporterProps = {
  onImported?: () => void | Promise<void>
}

export function SkillImporter({ onImported }: SkillImporterProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<ImportResult[]>([])

  const hasErrors = useMemo(() => results.some((result) => result.status === 'error'), [results])

  const importFiles = useCallback(
    async (files: FileList | File[]) => {
      const queue = Array.from(files).filter((file) => file.name.toLowerCase().endsWith('.zip'))
      if (!queue.length) {
        setResults([{ fileName: 'No valid file', status: 'error', message: 'Please choose a .zip skill package.' }])
        return
      }

      setImporting(true)
      const nextResults: ImportResult[] = []

      for (const file of queue) {
        try {
          const token = await getSupabaseAccessToken()
          const formData = new FormData()
          formData.append('file', file)

          const response = await fetch('/api/skills/import', {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
          })

          const payload = await response.json().catch(() => ({}))
          if (!response.ok) {
            nextResults.push({
              fileName: file.name,
              status: 'error',
              message: payload?.error || 'Import failed.',
            })
            continue
          }

          nextResults.push({
            fileName: file.name,
            status: 'success',
            message: payload?.message || 'Imported successfully.',
          })
        } catch (error: any) {
          nextResults.push({
            fileName: file.name,
            status: 'error',
            message: error?.message || 'Import failed.',
          })
        }
      }

      setResults(nextResults)
      setImporting(false)
      if (nextResults.some((result) => result.status === 'success')) {
        await onImported?.()
      }
    },
    [onImported]
  )

  return (
    <div
      className="rounded-3xl p-5"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.82), rgba(244,247,255,0.72))',
        border: '1px solid rgba(125, 154, 255, 0.18)',
        boxShadow: '0 18px 40px rgba(74, 85, 170, 0.08)',
      }}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.34em] text-[var(--accent-blue)]">
            <Archive size={14} />
            Skill Packages
          </div>
          <h3 className="mt-2 text-lg font-heading font-semibold text-[var(--text-primary)]">
            Import Claude-style skill bundles
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
            Upload a `.zip` package with a required `SKILL.md` plus optional `references/`, `templates/`, `scripts/`, and `README.md`.
            The app preserves the package structure instead of flattening it.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            multiple
            className="hidden"
            onChange={(event) => {
              if (event.target.files?.length) {
                importFiles(event.target.files)
                event.target.value = ''
              }
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-95"
            style={{
              background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
              boxShadow: '0 10px 22px rgba(91, 123, 255, 0.22)',
            }}
          >
            <Upload size={15} />
            Import ZIP
          </button>
        </div>
      </div>

      <div
        className="mt-4 rounded-3xl border-2 border-dashed p-6 text-center transition"
        style={{
          borderColor: dragActive ? 'rgba(91, 123, 255, 0.55)' : 'rgba(148, 163, 184, 0.35)',
          background: dragActive ? 'rgba(91, 123, 255, 0.06)' : 'rgba(255,255,255,0.5)',
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragActive(false)
          if (event.dataTransfer.files?.length) {
            importFiles(event.dataTransfer.files)
          }
        }}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
          {importing ? <Loader2 size={20} className="animate-spin text-[var(--accent-blue)]" /> : <Archive size={20} className="text-[var(--accent-blue)]" />}
        </div>
        <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">
          Drop a skill package here
        </p>
        <p className="mt-1 text-xs text-[var(--text-dim)]">
          Required: `SKILL.md` at the root or inside the package. If it is missing, the import is rejected.
        </p>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-[rgba(148,163,184,0.18)] bg-white/72 p-4">
          <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--text-dim)]">Required</div>
          <div className="mt-2 text-sm font-medium text-[var(--text-primary)]">`SKILL.md`</div>
          <div className="mt-1 text-xs text-[var(--text-secondary)]">Defines the skill, when to use it, and its working instructions.</div>
        </div>
        <div className="rounded-2xl border border-[rgba(148,163,184,0.18)] bg-white/72 p-4">
          <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--text-dim)]">Optional</div>
          <div className="mt-2 text-sm font-medium text-[var(--text-primary)]">`references/`, `templates/`, `scripts/`</div>
          <div className="mt-1 text-xs text-[var(--text-secondary)]">Kept as a live package so the skill can carry brand rules, prompt patterns, and helper scripts.</div>
        </div>
        <div className="rounded-2xl border border-[rgba(148,163,184,0.18)] bg-white/72 p-4">
          <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--text-dim)]">Best Use</div>
          <div className="mt-2 text-sm font-medium text-[var(--text-primary)]">Claude-style skill bundles</div>
          <div className="mt-1 text-xs text-[var(--text-secondary)]">One ZIP per skill, with the package preserved for future edits and optimization.</div>
        </div>
      </div>

      {results.length > 0 && (
        <div className="mt-4 space-y-2">
          {results.map((result) => (
            <div
              key={`${result.fileName}-${result.message}`}
              className="flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm"
              style={{
                borderColor: result.status === 'success' ? 'rgba(16, 185, 129, 0.26)' : 'rgba(248, 113, 113, 0.28)',
                background: result.status === 'success' ? 'rgba(16, 185, 129, 0.06)' : 'rgba(248, 113, 113, 0.06)',
              }}
            >
              {result.status === 'success' ? (
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-500" />
              ) : (
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-500" />
              )}
              <div>
                <div className="font-medium text-[var(--text-primary)]">{result.fileName}</div>
                <div className="text-[var(--text-secondary)]">{result.message}</div>
              </div>
            </div>
          ))}
          {hasErrors && (
            <p className="text-xs text-[var(--text-dim)]">
              If you see a validation error, make sure the ZIP contains a `SKILL.md` file before uploading again.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
