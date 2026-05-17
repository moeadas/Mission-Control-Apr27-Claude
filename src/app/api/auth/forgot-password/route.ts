/**
 * POST /api/auth/forgot-password   body: { email: string }
 *
 * Always returns 200 with the same shape regardless of whether the email
 * matches a real user — this prevents account enumeration via timing and
 * response signals. If the email is real, a reset link is emailed.
 */
import { NextRequest, NextResponse } from 'next/server'

import { getDb } from '@/lib/db/client'
import { createPasswordResetToken } from '@/lib/server/email-tokens'
import { buildPasswordResetEmail, sendEmail } from '@/lib/server/email'
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit'

export const dynamic = 'force-dynamic'

const GENERIC_RESPONSE = {
  ok: true,
  message: 'If an account exists for that email, a password-reset link has been sent.',
}

export async function POST(request: NextRequest) {
  try {
    // Two limits: per IP (broad) and per email (targeted spam against a victim).
    const ip = getClientIp(request.headers)
    const body = await request.json().catch(() => ({}))
    const email = String(body.email || '').trim().toLowerCase()
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

    const ipRl = await checkRateLimit(`auth:forgot:ip:${ip}`, { limit: 10, windowSeconds: 60 * 60, durable: true })
    const emailRl = await checkRateLimit(`auth:forgot:email:${email}`, { limit: 5, windowSeconds: 60 * 60, durable: true })
    if (!ipRl.allowed || !emailRl.allowed) {
      // Don't reveal that the limit was triggered — still return generic OK.
      return NextResponse.json(GENERIC_RESPONSE)
    }

    const db = getDb()
    const rows = await db`SELECT id FROM users WHERE email = ${email} AND is_active = true LIMIT 1`
    const user = rows[0]
    if (user) {
      try {
        const { token } = await createPasswordResetToken(user.id, ip)
        await sendEmail(buildPasswordResetEmail(email, token))
      } catch (err) {
        console.warn('[forgot-password] dispatch failed', err)
      }
    }

    return NextResponse.json(GENERIC_RESPONSE)
  } catch (err: any) {
    console.error('POST /api/auth/forgot-password error:', err)
    // Even on internal errors, surface the generic message to avoid enumeration.
    return NextResponse.json(GENERIC_RESPONSE)
  }
}
