/**
 * DELETE /api/admin/clients/[id]/delete
 *
 * Hard-deletes a client and all associated data (GDPR right-to-erasure).
 * Cascades: messages → conversations → task_assignments → tasks →
 *           outputs → knowledge_assets → client record.
 * Also removes uploaded files from public/uploads/client-assets/{clientId}/
 *
 * Accessible by super_admin and tenant admins for their own clients.
 */
import { rm } from 'node:fs/promises'
import path from 'node:path'

import { NextRequest, NextResponse } from 'next/server'
import { resolveAuthContextFromToken } from '@/lib/auth/server'
import { getDb } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

function getBearerToken(r: NextRequest) {
  const h = r.headers.get('authorization') || ''
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : null
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: clientId } = await params
    const db = getDb()

    // Verify client belongs to the same agency
    const [client] = await db`
      SELECT id, name FROM clients
      WHERE id = ${clientId}
        AND agency_id = ${auth.tenantId}
    `
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    // Cascade delete — order matters due to FKs
    // 1. Messages (child of conversations)
    await db`
      DELETE FROM messages
      WHERE conversation_id IN (
        SELECT id FROM conversations WHERE client_id = ${clientId}
      )
    `

    // 2. Conversations
    await db`DELETE FROM conversations WHERE client_id = ${clientId}`

    // 3. Task assignments (child of tasks)
    await db`
      DELETE FROM task_assignments
      WHERE task_id IN (
        SELECT id FROM tasks WHERE client_id = ${clientId}
      )
    `

    // 4. Tasks
    await db`DELETE FROM tasks WHERE client_id = ${clientId}`

    // 5. Outputs
    await db`DELETE FROM outputs WHERE client_id = ${clientId}`

    // 6. Knowledge assets
    await db`DELETE FROM knowledge_assets WHERE client_id = ${clientId}`

    // 7. Client record
    await db`DELETE FROM clients WHERE id = ${clientId} AND agency_id = ${auth.tenantId}`

    // 8. Remove uploaded files (best-effort — don't fail if dir doesn't exist)
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'client-assets', clientId)
    await rm(uploadsDir, { recursive: true, force: true }).catch(() => null)

    return NextResponse.json({
      ok: true,
      deleted: client.name,
      clientId,
    })
  } catch (err: any) {
    console.error('[client-delete]', err)
    return NextResponse.json({ error: err.message || 'Delete failed' }, { status: 500 })
  }
}
