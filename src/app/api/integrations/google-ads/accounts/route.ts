import { NextRequest, NextResponse } from 'next/server'

import { getAuthTokenFromRequest, resolveAuthContextFromToken } from '@/lib/auth/server'
import {
  googleAdsErrorResponse,
  listAccessibleGoogleAdsCustomers,
  resolveGoogleAdsAuth,
  tryDescribeGoogleAdsCustomer,
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
    const described = await Promise.all(customerIds.slice(0, 150).map((customerId) => tryDescribeGoogleAdsCustomer(customerId, adsAuth)))
    const skipped = described
      .filter((result) => result.error)
      .map((result) => ({
        code: result.error?.googleCode || result.error?.googleStatus || 'UNKNOWN',
        message: result.error?.message || 'Google Ads customer could not be queried',
      }))
    const accounts = described
      .map((result) => result.account)
      .filter((account): account is NonNullable<typeof account> => Boolean(account))
      .filter((account) => String(account.status || '').toUpperCase() !== 'CANCELED')
      .sort((a, b) => {
      const nameCompare = a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })
      return nameCompare || a.id.localeCompare(b.id, undefined, { sensitivity: 'base', numeric: true })
      })

    const defaultCustomerId = accounts.some((account) => account.id === adsAuth.defaultCustomerId)
      ? adsAuth.defaultCustomerId
      : accounts.find((account) => !account.manager)?.id || accounts[0]?.id || ''

    return NextResponse.json({
      accounts,
      count: accounts.length,
      defaultCustomerId,
      primaryMarket: adsAuth.primaryMarket,
      skippedCount: skipped.length,
      skipped,
    })
  } catch (error: any) {
    const response = googleAdsErrorResponse(error)
    return NextResponse.json(response.body, { status: response.status })
  }
}
