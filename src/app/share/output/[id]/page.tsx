import { notFound } from 'next/navigation'

import { buildArtifactHtml } from '@/lib/output-html'
import { sanitizeHtml } from '@/lib/html-sanitizer'
import { getDb } from '@/lib/db/client'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ t?: string }>
}

export default async function SharedOutputPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { t: shareToken } = await searchParams

  // SECURITY: A token is required. Without one we never look up the output,
  // so blind UUID enumeration cannot reveal other tenants' content.
  if (!shareToken) notFound()

  let output: any
  try {
    const db = getDb()
    const rows = await db`
      SELECT id, title, content, rendered_html, deliverable_type, status,
             created_at, share_token, share_expires_at
      FROM outputs
      WHERE id = ${id}
        AND share_token = ${shareToken}::uuid
      LIMIT 1
    `
    output = rows[0]
  } catch {
    notFound()
  }

  if (!output) notFound()

  // Enforce expiry
  if (output.share_expires_at) {
    const expiresAt = new Date(output.share_expires_at).getTime()
    if (Number.isFinite(expiresAt) && expiresAt < Date.now()) {
      return (
        <main className="min-h-screen bg-[#f7f7f2] px-4 py-10 text-slate-900">
          <div className="mx-auto max-w-2xl rounded-[28px] border border-[#d9dde6] bg-white px-6 py-10 text-center shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-rose-500">Link expired</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">This share link has expired</h1>
            <p className="mt-3 text-sm text-slate-500">
              Ask the owner of this output to generate a fresh share link.
            </p>
          </div>
        </main>
      )
    }
  }

  const rawHtml = output.rendered_html || buildArtifactHtml(output.content || '')
  // Sanitize before render. The output may have been produced by an LLM and we
  // never want it to execute arbitrary HTML/JS in a viewer's browser. The
  // shared sanitizeHtml module wraps DOMPurify with our agreed config.
  const safeHtml = sanitizeHtml(rawHtml)

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 rounded-[28px] border border-[#d9dde6] bg-white px-6 py-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#4f8ef7]">Mission Control Share View</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{output.title}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {String(output.deliverable_type || '').replace(/-/g, ' ')} · {output.status} · {new Date(output.created_at).toLocaleString()}
          </p>
        </header>

        <section
          className="artifact-render prose max-w-none rounded-[28px] border border-[#d9dde6] bg-white px-6 py-8 shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      </div>
    </main>
  )
}
