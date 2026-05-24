import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

import { resolveAuthContextFromToken, getAuthTokenFromRequest } from '@/lib/auth/server'
import { getDb } from '@/lib/db/client'

function getBearerToken(request: NextRequest) {
  // Batch P.2: cookie OR bearer. Local wrapper kept so call sites don't change.
  return getAuthTokenFromRequest(request)
}

// POST — change password for the currently authenticated user
export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const currentPassword = String(body.currentPassword || '')
    const newPassword = String(body.newPassword || '')

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current and new password are required' }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
    }

    const db = getDb()
    const rows = await db`
      SELECT password_hash FROM users
      WHERE id = ${auth.userId}::uuid
      LIMIT 1
    `
    const user = rows[0]
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const valid = await bcrypt.compare(currentPassword, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    const newHash = await bcrypt.hash(newPassword, 12)
    await db`
      UPDATE users SET password_hash = ${newHash}
      WHERE id = ${auth.userId}::uuid
    `

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Password change failed:', error)
    return NextResponse.json({ error: 'Password change failed' }, { status: 500 })
  }
}
