import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

import { resolveAuthContextFromToken } from '@/lib/auth/server'
import { getDb } from '@/lib/db/client'
import { signToken } from '@/lib/auth/jwt'

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim()
}

// GET — verify existing JWT
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

// POST — login with email + password, returns JWT
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const db = getDb()
    const rows = await db`
      SELECT id, email, role, password_hash, is_active
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `
    const user = rows[0]

    if (!user || !user.is_active) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = await signToken({ sub: user.id, email: user.email, role: user.role })
    return NextResponse.json({
      token,
      user: { id: user.id, email: user.email, role: user.role },
    })
  } catch (error) {
    console.error('Login failed:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
