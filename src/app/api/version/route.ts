import { NextResponse } from 'next/server'

// Returns the build ID so the client can detect when a new version is deployed
// and prompt the user to refresh.
export async function GET() {
  return NextResponse.json(
    { buildId: process.env.NEXT_PUBLIC_BUILD_ID || 'dev' },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}
