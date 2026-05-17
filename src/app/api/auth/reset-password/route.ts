/**
 * POST /api/auth/reset-password   body: { token: string, newPassword: string }
 *
 * Consumes a password-reset token (single-use) and updates the user's
 * password_hash. Rate-limited per IP.
 */
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

import { getDb } from '@/lib/db/client'
import { consumePasswordResetToken } from '@/lib/server/email-tokens'
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers)
    const rl = await checkRateLimit(`auth:reset:${ip}`, { limit: 10, windowSeconds: 60 * 10, durable: true })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please slow down.', retryAfterSeconds: rl.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      )
    }

    const body = await request.json().catch(() => ({}))
    const token = String(body.token || '').trim()
    const newPassword = String(body.newPassword || '')

    if (!token) return NextResponse.json({ error: 'Reset token is required' }, { status: 400 })
    if (!newPassword) return NextResponse.json({ error: 'New password is required' }, { status: 400 })
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const consumed = await consumePasswordResetToken(token)
    if (!consumed) {
      return NextResponse.json(
        { error: 'Reset link is invalid or has expired. Request a new one.', code: 'TOKEN_INVALID' },
        { status: 410 }
      )
    }

    const newHash = await bcrypt.hash(newPassword, 12)
    const db = getDb()
    await db`
      UPDATE users SET password_hash = ${newHash}, updated_at = now()
      WHERE id = ${consumed.userId}::uuid
    `

    // Invalidate any other outstanding reset tokens for this user — the
    // password has changed, so any in-flight link is stale.
    await db`
      UPDATE password_reset_tokens SET consumed_at = now()
      WHERE user_id = ${consumed.userId}::uuid AND consumed_at IS NULL
    `

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('POST /api/auth/reset-password error:', err)
    return NextResponse.json({ error: err.message || 'Reset failed' }, { status: 500 })
  }
}
