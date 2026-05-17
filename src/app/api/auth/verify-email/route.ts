/**
 * POST /api/auth/verify-email  body: { token: string }
 * Marks the user's email_verified_at when the token is valid and unconsumed.
 *
 * POST /api/auth/verify-email/resend  body: { email: string }
 * (Handled here too; keeps the surface tight.)
 *
 * Idempotent — already-consumed tokens return 410 Gone so the UI can show
 * "this link has already been used" instead of "invalid token".
 */
import { NextRequest, NextResponse } from 'next/server'

import { consumeEmailVerificationToken, createEmailVerificationToken } from '@/lib/server/email-tokens'
import { buildVerificationEmail, sendEmail } from '@/lib/server/email'
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit'
import { getDb } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Rate limit token submissions per IP (defence against bruteforcing tokens).
    const ip = getClientIp(request.headers)
    const rl = await checkRateLimit(`auth:verify-email:${ip}`, { limit: 20, windowSeconds: 60 * 10, durable: true })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please slow down.', retryAfterSeconds: rl.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      )
    }

    const body = await request.json().catch(() => ({}))

    // Resend path: POST { email } with no token → generate fresh link.
    if (!body.token && body.email) {
      const email = String(body.email).trim().toLowerCase()
      const db = getDb()
      const rows = await db`SELECT id FROM users WHERE email = ${email} AND email_verified_at IS NULL LIMIT 1`
      // To prevent email enumeration, always respond with the same shape.
      if (rows[0]) {
        const { token } = await createEmailVerificationToken(rows[0].id, email)
        await sendEmail(buildVerificationEmail(email, token))
      }
      return NextResponse.json({ ok: true, message: 'If an account exists for that email, a verification link has been sent.' })
    }

    const token = String(body.token || '').trim()
    if (!token) return NextResponse.json({ error: 'Verification token is required' }, { status: 400 })

    const result = await consumeEmailVerificationToken(token)
    if (!result) {
      return NextResponse.json(
        { error: 'Verification link is invalid or has already been used.', code: 'TOKEN_INVALID' },
        { status: 410 }
      )
    }

    return NextResponse.json({ ok: true, verified: true, email: result.email })
  } catch (err: any) {
    console.error('POST /api/auth/verify-email error:', err)
    return NextResponse.json({ error: err.message || 'Verification failed' }, { status: 500 })
  }
}
