// Meta OAuth Authentication Handler
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  if (code) {
    // Exchange code for access token
    // In production, call Meta's token exchange endpoint
    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?` + new URLSearchParams({
        client_id: process.env.META_APP_ID || '',
        client_secret: process.env.META_APP_SECRET || '',
        redirect_uri: `${url.origin}/api/auth/meta`,
        code,
      }))

      const data = await response.json()

      if (data.access_token) {
        return NextResponse.redirect(new URL('/settings?meta=connected', url.origin))
      }

      throw new Error('No access token received')
    } catch (error) {
      console.error('Meta OAuth error:', error)
      return NextResponse.redirect(new URL('/settings?meta=error', url.origin))
    }
  }

  // Generate auth URL
  const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth')
  authUrl.searchParams.set('client_id', process.env.META_APP_ID || '')
  authUrl.searchParams.set('redirect_uri', `${url.origin}/api/auth/meta`)
  authUrl.searchParams.set('scope', 'ads_management,ads_read,pages_read_engagement,business_management')

  return NextResponse.redirect(authUrl.toString())
}
