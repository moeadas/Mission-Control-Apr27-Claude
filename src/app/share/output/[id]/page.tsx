import { notFound } from 'next/navigation'

import { buildArtifactHtml } from '@/lib/output-html'
import { getSupabaseServerClient } from '@/lib/supabase/server'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function SharedOutputPage({ params }: PageProps) {
  const { id } = await params
  const supabase = getSupabaseServerClient()

  if (!supabase) notFound()

  const { data: output } = await supabase
    .from('outputs')
    .select('id, title, content, rendered_html, deliverable_type, status, created_at')
    .eq('id', id)
    .maybeSingle()

  if (!output) notFound()

  const html = output.rendered_html || buildArtifactHtml(output.content || '')

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
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </main>
  )
}
