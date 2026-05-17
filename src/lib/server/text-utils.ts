/**
 * Server-side text utilities (Batch I)
 *
 * Centralised replacements for code duplicated across the AI engines:
 *   • `escapeHtml()`        — used by every artifact-HTML builder (4 copies removed).
 *   • `looksLikeBoilerplateResponse()` — detects "AI returned coordination
 *     boilerplate instead of the deliverable". Used to be 4 inlined string-
 *     match helpers across chat/route + autonomous-task + output-quality;
 *     they all stay in sync now.
 *   • `truncate()`          — uniform "snip with ellipsis" used by every prompt
 *     builder.
 */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function truncate(value: string, max = 900): string {
  const normalized = (value ?? '').trim()
  if (normalized.length <= max) return normalized
  return `${normalized.slice(0, Math.max(0, max - 3))}...`
}

// Phrases that signal the model returned project-management or routing
// boilerplate instead of the actual deliverable. Kept as a single source so
// chat/route, autonomous-task, output-quality, and the engine fallback paths
// can never drift out of sync.
const BOILERPLATE_NEEDLES = [
  'task routed to',
  'lead agent',
  'next steps:',
  'status: in progress',
  'delivery:',
  'i have not drafted the deliverable yet',
  'no completed or delivered file exists',
  'iris could not complete that request',
  'chat request failed',
] as const

export function looksLikeBoilerplateResponse(response: string | undefined | null): boolean {
  if (!response) return false
  const lower = response.toLowerCase()
  return BOILERPLATE_NEEDLES.some((needle) => lower.includes(needle))
}
