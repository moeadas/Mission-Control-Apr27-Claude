import { NextRequest, NextResponse } from 'next/server'

import { normalizeProviderSettings, stripProviderSecrets } from '@/lib/provider-settings'
import { resolveAuthContextFromToken, saveUserProviderSettings, getAuthTokenFromRequest } from '@/lib/auth/server'
import { mergePersistedProviderSettings } from '@/lib/server/provider-secrets'

function getBearerToken(request: NextRequest) {
  // Batch P.2: cookie OR bearer. Local wrapper kept so call sites don't change.
  return getAuthTokenFromRequest(request)
}

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    // Merge incoming partial settings on top of persisted ones. If the client
    // sends an empty apiKey (because we never return real keys in GET responses
    // — see below), `mergePersistedProviderSettings` keeps the previously
    // persisted real key, so saves don't accidentally wipe credentials.
    const providerSettings = mergePersistedProviderSettings(
      normalizeProviderSettings(body?.providerSettings),
      auth.providerSettings
    )
    await saveUserProviderSettings(auth.userId, providerSettings)

    // Never echo the real keys back to the client.
    return NextResponse.json({
      ok: true,
      providerSettings: stripProviderSecrets(providerSettings),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save provider settings.' }, { status: 400 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Real API keys never cross the network. The client receives masked
    // versions only (`maskedKey` / `maskedToken`). The server uses the real
    // keys internally when generating content.
    return NextResponse.json({
      ok: true,
      providerSettings: stripProviderSecrets(auth.providerSettings),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load provider settings.' }, { status: 400 })
  }
}
