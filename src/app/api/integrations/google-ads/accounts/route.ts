import { NextRequest, NextResponse } from 'next/server'

import { getAuthTokenFromRequest, resolveAuthContextFromToken } from '@/lib/auth/server'
import {
  describeGoogleAdsCustomer,
  listAccessibleGoogleAdsCustomers,
  resolveGoogleAdsAuth,
} from '@/lib/server/google-ads-api'

function getBearerToken(request: NextRequest) {
  return getAuthTokenFromRequest(request)
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authContext = await resolveAuthContextFromToken(getBearerToken(request))
    if (!authContext) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adsAuth = await resolveGoogleAdsAuth(authContext.userId, authContext.providerSettings)
    const customerIds = await listAccessibleGoogleAdsCustomers(adsAuth)
    const accounts = (
      await Promise.all(customerIds.slice(0, 150).map((customerId) => describeGoogleAdsCustomer(customerId, adsAuth)))
    ).sort((a, b) => {
      const nameCompare = a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })
      return nameCompare || a.id.localeCompare(b.id, undefined, { sensitivity: 'base', numeric: true })
    })

    return NextResponse.json({
      accounts,
      count: accounts.length,
      defaultCustomerId: adsAuth.defaultCustomerId || accounts.find((account) => !account.manager)?.id || accounts[0]?.id || '',
      primaryMarket: adsAuth.primaryMarket,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load Google Ads accounts' }, { status: 500 })
  }
}
