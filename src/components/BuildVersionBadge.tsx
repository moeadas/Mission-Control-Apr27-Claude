'use client'

/**
 * Build version chip — visible in the Settings page header so the user
 * always knows which build they're testing.
 *
 * `NEXT_PUBLIC_BUILD_ID` is set to `Date.now().toString()` at build time
 * (see next.config.mjs). We decode it back to a Date for the timestamp.
 * When env var is missing (dev runs), we fall back to "dev".
 */
import React from 'react'

function formatBuildTimestamp(buildId: string): string | null {
  const ts = Number(buildId)
  if (!Number.isFinite(ts) || ts < 1_000_000_000_000) return null
  const d = new Date(ts)
  // ISO-style but human readable: "2026-05-17 19:42 UTC"
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`
}

export function BuildVersionBadge({ className = '' }: { className?: string }) {
  const buildId = process.env.NEXT_PUBLIC_BUILD_ID || 'dev'
  const stamp = buildId === 'dev' ? null : formatBuildTimestamp(buildId)
  const short = buildId === 'dev' ? 'dev' : buildId.slice(-6)

  return (
    <div
      title={stamp ? `Full build id: ${buildId}` : 'Local dev build'}
      className={`inline-flex items-center gap-2 rounded-full border border-border bg-base px-3 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-text-secondary ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-accent-cyan" />
      <span>Build</span>
      <span className="text-text-primary">{short}</span>
      {stamp && (
        <>
          <span className="text-text-dim">·</span>
          <span className="text-text-secondary normal-case tracking-normal">{stamp}</span>
        </>
      )}
    </div>
  )
}
