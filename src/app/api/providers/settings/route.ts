import { NextRequest, NextResponse } from 'next/server'

import { normalizeProviderSettings } from '@/lib/provider-settings'
import { resolveAuthContextFromToken, saveUserProviderSettings } from '@/lib/auth/server'
import { mergePersistedProviderSettings } from '@/lib/server/provider-secrets'

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim()
}

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const providerSettings = mergePersistedProviderSettings(
      normalizeProviderSettings(body?.providerSettings),
      auth.providerSettings
    )
    await saveUserProviderSettings(auth.userId, providerSettings)

    return NextResponse.json({
      ok: true,
      providerSettings,
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

    return NextResponse.json({
      ok: true,
      providerSettings: auth.providerSettings,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load provider settings.' }, { status: 400 })
  }
}
