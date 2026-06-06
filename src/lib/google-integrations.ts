// Google Integrations Helper
//
// Batch G refactor:
//   • Removed the broken `getGoogleAdsData()` helper that referenced
//     `google.ads()` — that method does not exist on the `googleapis` SDK;
//     the Ads API requires the separate `google-ads-api` package and a
//     developer token. Re-introduce only when we wire real Ads pulls.
//   • The OAuth flow now lives under /api/auth/google + /api/auth/google/callback
//     and stores tokens encrypted via lib/server/oauth-tokens.ts.
//   • This module keeps the lightweight Docs/Sheets wrappers that read/write
//     content using an already-authenticated OAuth2 client supplied by callers.

import { google } from 'googleapis'

import { normalizeProviderSettings } from '@/lib/provider-settings'
import { getOAuthToken, isAccessTokenExpired, saveOAuthToken } from '@/lib/server/oauth-tokens'
import { loadPersistedProviderSettings } from '@/lib/server/provider-secrets'
import type { ProviderSettings } from '@/lib/types'

export function resolveGoogleOAuthConfig(input?: {
  providerSettings?: Partial<ProviderSettings> | null
  origin?: string
}) {
  const settings = normalizeProviderSettings(input?.providerSettings)
  const saved = settings.google
  const clientId = saved?.enabled && saved.clientId ? saved.clientId : process.env.GOOGLE_CLIENT_ID || ''
  const clientSecret =
    saved?.enabled && saved.clientSecret ? saved.clientSecret : process.env.GOOGLE_CLIENT_SECRET || ''
  const redirectUri =
    saved?.enabled && saved.redirectUri
      ? saved.redirectUri
      : process.env.GOOGLE_REDIRECT_URI ||
        `${(input?.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/api/auth/google/callback`

  return {
    clientId: clientId.trim(),
    clientSecret: clientSecret.trim(),
    redirectUri: redirectUri.trim(),
    source: saved?.enabled && saved.clientId && saved.clientSecret ? 'user' : 'env',
  }
}

/** Build a fresh OAuth2 client (no credentials attached). Used by both the
 *  auth-flow routes and helpers below that load+refresh per-user tokens. */
export function getGoogleOAuth2Client(input?: {
  providerSettings?: Partial<ProviderSettings> | null
  origin?: string
}) {
  const config = resolveGoogleOAuthConfig(input)
  return new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri)
}

export async function refreshGoogleAccessTokenForUser(userId: string): Promise<InstanceType<typeof google.auth.OAuth2> | null> {
  const token = await getOAuthToken(userId, 'google')
  if (!token?.refreshToken) return null

  const providerSettings = await loadPersistedProviderSettings(userId)
  const config = resolveGoogleOAuthConfig({ providerSettings })
  if (!config.clientId || !config.clientSecret) return null

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: token.refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.access_token) {
    const reasonParts = [
      data?.error,
      data?.error_description,
      !data?.error && !data?.error_description ? `HTTP ${response.status}` : '',
    ].filter(Boolean)
    const reason = reasonParts.join(': ') || `Google token refresh failed with HTTP ${response.status}.`
    throw new Error(`Google connection needs to be reconnected: ${reason}`)
  }

  await saveOAuthToken({
    userId,
    provider: 'google',
    accountEmail: token.accountEmail,
    scope: data.scope || token.scope,
    accessToken: data.access_token,
    refreshToken: token.refreshToken,
    expiresAt: data.expires_in ? new Date(Date.now() + Number(data.expires_in) * 1000) : token.expiresAt,
  })

  const client = getGoogleOAuth2Client({ providerSettings })
  client.setCredentials({
    access_token: data.access_token,
    refresh_token: token.refreshToken,
    expiry_date: data.expires_in ? Date.now() + Number(data.expires_in) * 1000 : token.expiresAt?.getTime(),
  })
  return client
}

export async function getGoogleAccessTokenForUser(userId: string): Promise<string | null> {
  const token = await getOAuthToken(userId, 'google')
  if (!token?.accessToken) return null
  if (!isAccessTokenExpired(token)) return token.accessToken

  const refreshed = await refreshGoogleAccessTokenForUser(userId)
  const credentials = refreshed?.credentials
  return credentials?.access_token || null
}

/**
 * Return an OAuth2 client with the user's stored credentials applied. Refreshes
 * the access token automatically if it has expired and we have a refresh
 * token. Returns null if the user has not connected Google yet.
 */
export async function getGoogleClientForUser(userId: string): Promise<InstanceType<typeof google.auth.OAuth2> | null> {
  const token = await getOAuthToken(userId, 'google')
  if (!token?.accessToken) return null

  const providerSettings = await loadPersistedProviderSettings(userId)
  const client = getGoogleOAuth2Client({ providerSettings })
  client.setCredentials({
    access_token: token.accessToken,
    refresh_token: token.refreshToken ?? undefined,
    expiry_date: token.expiresAt ? token.expiresAt.getTime() : undefined,
  })

  if (isAccessTokenExpired(token) && token.refreshToken) {
    try {
      return await refreshGoogleAccessTokenForUser(userId)
    } catch (err) {
      console.warn('[google-integrations] refresh failed:', err)
    }
  }

  return client
}

// ─── Docs / Sheets convenience wrappers (used by AI tools) ──────────────────

export async function readGoogleDoc(docId: string, auth: any) {
  const docs = google.docs({ version: 'v1', auth })
  const response = await docs.documents.get({ documentId: docId })
  return response.data
}

export async function createGoogleDoc(title: string, content: string, auth: any) {
  const docs = google.docs({ version: 'v1', auth })

  const response = await docs.documents.create({ requestBody: { title } })
  const docId = response.data.documentId

  if (docId && content) {
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: {
        requests: [{
          insertText: { location: { index: 1 }, text: content },
        }],
      },
    })
  }

  return response.data
}

export async function readGoogleSheet(sheetId: string, range: string, auth: any) {
  const sheets = google.sheets({ version: 'v4', auth })
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  })
  return response.data.values
}

export async function updateGoogleSheet(sheetId: string, range: string, values: any[][], auth: any) {
  const sheets = google.sheets({ version: 'v4', auth })
  const response = await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: { values },
  })
  return response.data
}
