/**
 * Single-use auth tokens (Batch E)
 *
 * Email verification, password reset, and tenant invitation share the same
 * token primitive: random URL-safe string, written to DB with an expiry,
 * single-use via `consumed_at`.
 *
 * Tokens are 32 bytes of crypto-random → base64url (~43 chars). Stored
 * directly (no hashing) because they're already cryptographically random and
 * the DB row is the single point of failure; if the DB leaks, an attacker has
 * bigger problems than predicting a token.
 */
import { randomBytes } from 'node:crypto'

import { getDb } from '@/lib/db/client'

export const DEFAULT_VERIFY_EXPIRY_MIN = 60 * 24            // 24h
export const DEFAULT_RESET_EXPIRY_MIN = 60                  // 1h
export const DEFAULT_INVITE_EXPIRY_MIN = 60 * 24 * 7        // 7d

export function newToken(): string {
  return randomBytes(32).toString('base64url')
}

function minutesFromNow(min: number): Date {
  return new Date(Date.now() + min * 60 * 1000)
}

/* ───────────────────── EMAIL VERIFICATION ───────────────────── */

export async function createEmailVerificationToken(userId: string, email: string, expiryMinutes = DEFAULT_VERIFY_EXPIRY_MIN) {
  const token = newToken()
  const expiresAt = minutesFromNow(expiryMinutes)
  const db = getDb()
  await db`
    INSERT INTO email_verification_tokens (token, user_id, email, expires_at)
    VALUES (${token}, ${userId}::uuid, ${email}, ${expiresAt.toISOString()})
  `
  return { token, expiresAt }
}

export async function consumeEmailVerificationToken(token: string): Promise<{ userId: string; email: string } | null> {
  const db = getDb()
  const rows = await db`
    UPDATE email_verification_tokens
    SET consumed_at = now()
    WHERE token = ${token}
      AND consumed_at IS NULL
      AND expires_at > now()
    RETURNING user_id, email
  `
  if (!rows[0]) return null
  // Mark the user's email_verified_at column.
  await db`
    UPDATE users SET email_verified_at = now(), updated_at = now()
    WHERE id = ${rows[0].user_id}::uuid
  `
  return { userId: rows[0].user_id, email: rows[0].email }
}

/* ───────────────────── PASSWORD RESET ───────────────────── */

export async function createPasswordResetToken(userId: string, requestIp?: string | null, expiryMinutes = DEFAULT_RESET_EXPIRY_MIN) {
  const token = newToken()
  const expiresAt = minutesFromNow(expiryMinutes)
  const db = getDb()
  await db`
    INSERT INTO password_reset_tokens (token, user_id, expires_at, request_ip)
    VALUES (${token}, ${userId}::uuid, ${expiresAt.toISOString()}, ${requestIp ?? null})
  `
  return { token, expiresAt }
}

export async function consumePasswordResetToken(token: string): Promise<{ userId: string } | null> {
  const db = getDb()
  const rows = await db`
    UPDATE password_reset_tokens
    SET consumed_at = now()
    WHERE token = ${token}
      AND consumed_at IS NULL
      AND expires_at > now()
    RETURNING user_id
  `
  return rows[0] ? { userId: rows[0].user_id } : null
}

/* ───────────────────── TENANT INVITATIONS ───────────────────── */

export async function createTenantInvitation(opts: {
  tenantId: string
  email: string
  role: 'admin' | 'member'
  invitedBy: string
  expiryMinutes?: number
}) {
  const token = newToken()
  const expiresAt = minutesFromNow(opts.expiryMinutes ?? DEFAULT_INVITE_EXPIRY_MIN)
  const db = getDb()
  await db`
    INSERT INTO tenant_invitations (token, tenant_id, email, role, invited_by, expires_at)
    VALUES (
      ${token},
      ${opts.tenantId}::uuid,
      ${opts.email.toLowerCase()},
      ${opts.role},
      ${opts.invitedBy}::uuid,
      ${expiresAt.toISOString()}
    )
  `
  return { token, expiresAt }
}

export async function getActiveInvitation(token: string) {
  const db = getDb()
  const rows = await db`
    SELECT i.*, a.name AS tenant_name
    FROM tenant_invitations i
    JOIN agencies a ON a.id = i.tenant_id
    WHERE i.token = ${token}
      AND i.consumed_at IS NULL
      AND i.expires_at > now()
    LIMIT 1
  `
  return rows[0] || null
}

export async function consumeTenantInvitation(token: string, acceptedUserId: string): Promise<{ tenantId: string; email: string; role: string } | null> {
  const db = getDb()
  const rows = await db`
    UPDATE tenant_invitations
    SET consumed_at = now(), accepted_user = ${acceptedUserId}::uuid
    WHERE token = ${token}
      AND consumed_at IS NULL
      AND expires_at > now()
    RETURNING tenant_id, email, role
  `
  return rows[0] ? { tenantId: rows[0].tenant_id, email: rows[0].email, role: rows[0].role } : null
}
