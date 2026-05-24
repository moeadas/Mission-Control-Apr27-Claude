/**
 * POST /api/auth/logout
 *
 * Clears the httpOnly session cookie set by /api/auth/session POST and
 * /api/auth/register (super-admin auto-register). Idempotent — returns 200
 * even when no cookie is present so the client can call this on app start
 * to scrub any stale session without first checking.
 *
 * The JWT itself is still valid until its expiry, so a copy that was stored
 * client-side via the legacy bearer-in-JS path will continue to work until
 * P.2 ships and the client stops sending it. This is acceptable for the
 * cookie-side of the migration: the *cookie* is what we're hardening
 * against XSS, and once it's cleared, an XSS exploit can no longer
 * piggy-back on the user's session via the cookie path.
 *
 * (Batch P.1)
 */
import { NextRequest, NextResponse } from 'next/server'

import { clearSessionCookie } from '@/lib/auth/server'

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true })
  clearSessionCookie(response, request)
  return response
}
