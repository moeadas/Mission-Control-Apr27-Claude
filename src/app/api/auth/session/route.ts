import { NextRequest, NextResponse } from 'next/server'

import { resolveAuthContextFromToken } from '@/lib/supabase/auth'

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim()
}

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: auth.userId,
        email: auth.email,
        role: auth.role,
      },
    })
  } catch (error) {
    console.error('Failed to resolve auth session:', error)
    return NextResponse.json({ authenticated: false, error: 'Failed to resolve auth session' }, { status: 500 })
  }
}
