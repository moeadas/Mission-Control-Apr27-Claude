/**
 * GET /api/agent-templates
 *
 * Returns the catalogue of agent templates available for cloning. These are
 * the 10 starter agents bundled with the app (Iris, Atlas, Echo, Lyra, etc.).
 * Each tenant decides which ones (if any) to clone into their virtual company.
 *
 * Auth required (any authenticated user — templates are app-wide, not
 * tenant-specific).
 */
import { NextRequest, NextResponse } from 'next/server'

import { resolveAuthContextFromToken, getAuthTokenFromRequest } from '@/lib/auth/server'
import { listAgentTemplates, REQUIRED_TEMPLATE_IDS } from '@/lib/server/agent-templates'

export const dynamic = 'force-dynamic'

function getBearerToken(req: NextRequest) {
  // Batch P.2: cookie OR bearer. Local wrapper kept so call sites don't change.
  return getAuthTokenFromRequest(req)
}

export async function GET(request: NextRequest) {
  const auth = await resolveAuthContextFromToken(getBearerToken(request))
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const templates = listAgentTemplates()
  return NextResponse.json({
    ok: true,
    templates,
    requiredTemplateIds: [...REQUIRED_TEMPLATE_IDS],
    note: 'These are starter templates. Each tenant clones the ones they need. Iris is auto-seeded into every new tenant.',
  })
}
