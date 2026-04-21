import { NextResponse } from 'next/server'

import { readAgentPhotoMap } from '@/lib/server/agent-photos'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const photos = await readAgentPhotoMap()
    return NextResponse.json(
      { photos },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    )
  } catch (error) {
    console.error('Failed to load agent photos:', error)
    return NextResponse.json({ error: 'Failed to load agent photos' }, { status: 500 })
  }
}
