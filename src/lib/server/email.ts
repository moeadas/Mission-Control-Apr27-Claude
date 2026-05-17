/**
 * Transactional email dispatcher (Batch E scaffolding, Batch G wires real provider)
 *
 * Today this is a structured-logging stub: every send call prints the email
 * payload to the server log. In Batch G we'll wire Resend (or any other ESP)
 * via env: when `RESEND_API_KEY` is set, deliveries go through the API; when
 * unset, the stub keeps logging so dev / proof-of-concept stays unblocked.
 *
 * Always preserve the same call signature so callers don't need to change
 * when the real provider is added.
 */

interface SendArgs {
  to: string
  subject: string
  /** Plain-text body. */
  text: string
  /** Optional HTML body. If omitted, providers render the text version. */
  html?: string
  /** "category" / template tag for analytics. */
  category?: string
}

const EMAIL_FROM = process.env.EMAIL_FROM || 'no-reply@mission-control.local'
const RESEND_API_KEY = process.env.RESEND_API_KEY

function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

/** Build a fully-qualified URL out of an in-app path. */
export function appUrl(pathWithLeadingSlash: string): string {
  const base = appBaseUrl().replace(/\/+$/, '')
  const path = pathWithLeadingSlash.startsWith('/') ? pathWithLeadingSlash : `/${pathWithLeadingSlash}`
  return `${base}${path}`
}

export async function sendEmail(args: SendArgs): Promise<{ ok: boolean; provider: string }> {
  // Real-provider path (wired in Batch G).
  if (RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: EMAIL_FROM,
          to: [args.to],
          subject: args.subject,
          text: args.text,
          html: args.html ?? undefined,
          tags: args.category ? [{ name: 'category', value: args.category }] : undefined,
        }),
      })
      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        console.error('[email] Resend send failed', { status: res.status, detail })
        return { ok: false, provider: 'resend' }
      }
      return { ok: true, provider: 'resend' }
    } catch (err) {
      console.error('[email] Resend send error', err)
      return { ok: false, provider: 'resend' }
    }
  }

  // Stub path — log the payload prominently so developers can copy-paste
  // verification / reset links from the server console during local testing.
  console.log('[email:stub] ----------------------------------------')
  console.log(`[email:stub] To:       ${args.to}`)
  console.log(`[email:stub] Subject:  ${args.subject}`)
  if (args.category) console.log(`[email:stub] Category: ${args.category}`)
  console.log('[email:stub] Body:')
  console.log(args.text)
  console.log('[email:stub] ----------------------------------------')
  return { ok: true, provider: 'stub' }
}

/* ───────────────────────── Pre-built templates ───────────────────────── */

export function buildVerificationEmail(toEmail: string, token: string) {
  const link = appUrl(`/verify-email?token=${encodeURIComponent(token)}`)
  return {
    to: toEmail,
    subject: 'Verify your Mission Control account',
    category: 'email-verification',
    text: [
      'Welcome to Mission Control.',
      '',
      'Click the link below to verify your email and activate your workspace:',
      link,
      '',
      'If you didn\'t sign up, you can safely ignore this message — the link expires in 24 hours.',
    ].join('\n'),
    html: undefined,
  } satisfies SendArgs
}

export function buildPasswordResetEmail(toEmail: string, token: string) {
  const link = appUrl(`/reset-password?token=${encodeURIComponent(token)}`)
  return {
    to: toEmail,
    subject: 'Reset your Mission Control password',
    category: 'password-reset',
    text: [
      'Someone requested a password reset for your Mission Control account.',
      '',
      'If that was you, click the link below to set a new password:',
      link,
      '',
      'The link expires in 1 hour. If you didn\'t request a reset, you can ignore this email.',
    ].join('\n'),
  } satisfies SendArgs
}

export function buildTenantInviteEmail(toEmail: string, inviterEmail: string, tenantName: string, token: string) {
  const link = appUrl(`/accept-invite?token=${encodeURIComponent(token)}`)
  return {
    to: toEmail,
    subject: `${inviterEmail} invited you to join ${tenantName} on Mission Control`,
    category: 'tenant-invitation',
    text: [
      `${inviterEmail} has invited you to join the "${tenantName}" workspace on Mission Control.`,
      '',
      'Click the link below to accept the invitation:',
      link,
      '',
      'The link expires in 7 days.',
    ].join('\n'),
  } satisfies SendArgs
}
