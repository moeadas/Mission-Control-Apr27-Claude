// Google OAuth Authentication Handler
import { NextResponse } from 'next/server'
import { google } from 'googleapis'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/adwords',
]

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  if (code) {
    // Exchange code for tokens
    try {
      const { tokens } = await oauth2Client.getToken(code)
      oauth2Client.setCredentials(tokens)

      // Store tokens securely (in production, use encrypted database)
      // For now, redirect with success
      return NextResponse.redirect(new URL('/settings?google=connected', url.origin))
    } catch (error) {
      console.error('Google OAuth error:', error)
      return NextResponse.redirect(new URL('/settings?google=error', url.origin))
    }
  }

  // Generate auth URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  })

  return NextResponse.redirect(authUrl)
}
