/**
 * GET /api/admin/clients/[id]/export
 *
 * Exports all data associated with a client as a JSON document.
 * Accessible by super_admin and tenant admins for their own clients.
 * Suitable for GDPR right-of-access requests.
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveAuthContextFromToken } from '@/lib/auth/server'
import { getDb } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

function getBearerToken(r: NextRequest) {
  const h = r.headers.get('authorization') || ''
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: clientId } = await params
    const db = getDb()

    // Load the client record — must belong to the same agency
    const [client] = await db`
      SELECT * FROM clients
      WHERE id = ${clientId}
        AND agency_id = ${auth.tenantId}
    `
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    // Gather all related data in parallel
    const [
      knowledgeAssets,
      tasks,
      outputs,
      conversations,
    ] = await Promise.all([
      db`SELECT * FROM knowledge_assets WHERE client_id = ${clientId}`,
      db`SELECT * FROM tasks WHERE client_id = ${clientId} ORDER BY created_at`,
      db`SELECT * FROM outputs WHERE client_id = ${clientId} ORDER BY created_at`,
      db`SELECT c.*, m.content AS messages FROM conversations c
         LEFT JOIN LATERAL (
           SELECT json_agg(msg ORDER BY msg.created_at) AS content
           FROM messages msg WHERE msg.conversation_id = c.id
         ) m ON true
         WHERE c.client_id = ${clientId}
         ORDER BY c.created_at`,
    ])

    // Strip internal fields from export
    const sanitise = (rows: any[]) =>
      rows.map(r => {
        const { agency_id, tenant_id, ...rest } = r as any
        return rest
      })

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedBy: auth.email,
      client: sanitise([client])[0],
      knowledgeAssets: sanitise(knowledgeAssets as any[]),
      tasks: sanitise(tasks as any[]),
      outputs: sanitise(outputs as any[]),
      conversations: sanitise(conversations as any[]),
      counts: {
        knowledgeAssets: (knowledgeAssets as any[]).length,
        tasks: (tasks as any[]).length,
        outputs: (outputs as any[]).length,
        conversations: (conversations as any[]).length,
      },
    }

    const json = JSON.stringify(exportData, null, 2)
    const filename = `client-export-${clientId}-${new Date().toISOString().slice(0, 10)}.json`

    return new NextResponse(json, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    console.error('[client-export]', err)
    return NextResponse.json({ error: err.message || 'Export failed' }, { status: 500 })
  }
}
