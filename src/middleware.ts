/**
 * Edge middleware — Batch AA: security headers.
 *
 * Sets a sensible-default Content-Security-Policy plus the standard
 * defense-in-depth headers (X-Frame-Options, X-Content-Type-Options,
 * Referrer-Policy, Permissions-Policy). HSTS is only set when the request
 * is already over HTTPS — sending it over plain HTTP would be useless
 * and confusing during the pre-TLS rollout phase.
 *
 * CSP rationale:
 *   • script-src 'self' 'unsafe-inline' 'unsafe-eval' — Next.js inlines
 *     small JS chunks, and Turbopack/HMR uses eval in dev. We accept the
 *     trade-off in exchange for a working app; tightening this is a
 *     future batch (requires per-request nonce wiring).
 *   • style-src 'self' 'unsafe-inline' — Tailwind + framer-motion + every
 *     React inline style attribute. Removing 'unsafe-inline' here breaks
 *     the app today.
 *   • connect-src — same-origin plus the LLM provider endpoints we call
 *     from the client (Ollama Cloud, Gemini, Anthropic, OpenAI), plus
 *     Stripe for billing.
 *   • frame-ancestors 'none' — replaces X-Frame-Options for modern browsers.
 *
 * The middleware runs on every non-static path. Static assets are excluded
 * via `config.matcher` to avoid the per-asset overhead and because they
 * already inherit headers from the parent document.
 */

import { NextResponse, type NextRequest } from 'next/server'

const CSP_DIRECTIVES = [
  "default-src 'self'",
  // 'unsafe-inline' + 'unsafe-eval' required for Next.js + Turbopack today.
  // Future hardening: per-request nonce.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' data: blob:",
  [
    "connect-src 'self'",
    'https://api.ollama.com',
    'https://api.openai.com',
    'https://api.anthropic.com',
    'https://generativelanguage.googleapis.com',
    'https://api.stripe.com',
    // Browser-injected origins we don't want to block.
    'wss:',
    'ws:',
  ].join(' '),
  // Stripe Checkout iframe (when enabled). frame-src 'none' would break it.
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

const STATIC_PERMISSIONS_POLICY = [
  'accelerometer=()',
  'autoplay=()',
  'camera=()',
  'display-capture=()',
  'encrypted-media=()',
  'fullscreen=(self)',
  'geolocation=()',
  'gyroscope=()',
  'magnetometer=()',
  'microphone=()',
  'midi=()',
  'payment=(self)',
  'picture-in-picture=()',
  'publickey-credentials-get=()',
  'screen-wake-lock=()',
  'sync-xhr=()',
  'usb=()',
  'xr-spatial-tracking=()',
].join(', ')

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  response.headers.set('Content-Security-Policy', CSP_DIRECTIVES)
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', STATIC_PERMISSIONS_POLICY)
  response.headers.set('X-DNS-Prefetch-Control', 'off')

  // HSTS only when the connection is already secured. Setting HSTS over
  // plain HTTP is a no-op and confuses some browsers when the user later
  // visits the HTTPS variant. Once Caddy/Let's Encrypt is in front of the
  // app, every request will be HTTPS and the header will be active.
  const forwardedProto = request.headers.get('x-forwarded-proto') || ''
  const isHttps = forwardedProto === 'https' || request.nextUrl.protocol === 'https:'
  if (isHttps) {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }

  return response
}

// Skip static files + Next internals. We still want headers on /api routes
// so that XHR responses carry CSP-relevant context (especially for connect-src
// preflight in cross-origin contexts) and so error pages can't be embedded.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
