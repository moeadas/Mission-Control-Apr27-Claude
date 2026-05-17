/**
 * Encrypted OAuth-token storage (Batch G)
 *
 * After a successful Google / Meta / future-provider OAuth flow, the access
 * token and refresh token are stored in the `oauth_tokens` table — encrypted
 * via AES-256-GCM envelope (Batch F). The `*_encrypted` columns hold the
 * JSON envelopes verbatim.
 *
 * `getOAuthToken()` returns plaintext tokens ready to use in API calls.
 * Callers can refresh expired access tokens by calling the provider's token
 * endpoint with the stored refresh token, then writing the new pair back via
 * `saveOAuthToken()`.
 */
import { getDb } from '@/lib/db/client'
import {
  decryptString,
  encryptString,
  isEncryptedEnvelope,
} from '@/lib/server/secret-crypto'

export type OAuthProvider = 'google' | 'meta'

export interface OAuthTokenInput {
  userId: string
  provider: OAuthProvider
  accountEmail?: string | null
  scope?: string | null
  accessToken: string
  refreshToken?: string | null
  expiresAt?: Date | null
}

export interface OAuthTokenRecord {
  provider: OAuthProvider
  accountEmail: string | null
  scope: string | null
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
}

function envelopeOrNull(value: string | null | undefined) {
  if (!value) return null
  const env = encryptString(value)
  // When PROVIDER_SECRETS_MASTER_KEY is unset we fall back to plaintext —
  // the secret-crypto helper logged a one-time warning. We still wrap the
  // value in a JSONB shape (`{ plaintext: ... }`) so the column type is
  // consistent and the read-side knows to skip decryption.
  return env ?? { plaintext: value }
}

function readEnvelope(value: any): string | null {
  if (!value) return null
  if (isEncryptedEnvelope(value)) return decryptString(value)
  if (typeof value === 'object' && typeof value.plaintext === 'string') return value.plaintext
  // Defensive: if someone stored a raw string in the JSONB column, return it.
  if (typeof value === 'string') return value
  return null
}

export async function saveOAuthToken(input: OAuthTokenInput): Promise<void> {
  const db = getDb()
  const accessEnv = envelopeOrNull(input.accessToken)
  const refreshEnv = envelopeOrNull(input.refreshToken ?? null)

  await db`
    INSERT INTO oauth_tokens (
      user_id, provider, account_email, scope,
      access_token_encrypted, refresh_token_encrypted, expires_at
    ) VALUES (
      ${input.userId}::uuid,
      ${input.provider},
      ${input.accountEmail ?? null},
      ${input.scope ?? null},
      ${accessEnv ? JSON.stringify(accessEnv) : null}::jsonb,
      ${refreshEnv ? JSON.stringify(refreshEnv) : null}::jsonb,
      ${input.expiresAt ? input.expiresAt.toISOString() : null}
    )
    ON CONFLICT (user_id, provider) DO UPDATE SET
      account_email           = EXCLUDED.account_email,
      scope                   = COALESCE(EXCLUDED.scope, oauth_tokens.scope),
      access_token_encrypted  = EXCLUDED.access_token_encrypted,
      -- Some providers (e.g. Google) only return a refresh_token on the very
      -- first consent. Don't overwrite a stored refresh token with NULL.
      refresh_token_encrypted = COALESCE(EXCLUDED.refresh_token_encrypted, oauth_tokens.refresh_token_encrypted),
      expires_at              = EXCLUDED.expires_at,
      updated_at              = now()
  `
}

export async function getOAuthToken(userId: string, provider: OAuthProvider): Promise<OAuthTokenRecord | null> {
  const db = getDb()
  const rows = await db`
    SELECT provider, account_email, scope,
           access_token_encrypted, refresh_token_encrypted, expires_at
    FROM oauth_tokens
    WHERE user_id = ${userId}::uuid AND provider = ${provider}
    LIMIT 1
  `
  const row = rows[0]
  if (!row) return null

  try {
    return {
      provider: row.provider as OAuthProvider,
      accountEmail: row.account_email ?? null,
      scope: row.scope ?? null,
      accessToken: readEnvelope(row.access_token_encrypted) ?? '',
      refreshToken: readEnvelope(row.refresh_token_encrypted),
      expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    }
  } catch (err) {
    console.error('[oauth-tokens] decrypt failed for user', userId, 'provider', provider, err)
    return null
  }
}

export async function deleteOAuthToken(userId: string, provider: OAuthProvider): Promise<boolean> {
  const db = getDb()
  const rows = await db`
    DELETE FROM oauth_tokens
    WHERE user_id = ${userId}::uuid AND provider = ${provider}
    RETURNING id
  `
  return rows.length > 0
}

/** Returns true if the stored access token has expired (or expiry unknown). */
export function isAccessTokenExpired(record: OAuthTokenRecord, skewSeconds = 60): boolean {
  if (!record.expiresAt) return true
  const now = Date.now()
  return record.expiresAt.getTime() - skewSeconds * 1000 <= now
}
