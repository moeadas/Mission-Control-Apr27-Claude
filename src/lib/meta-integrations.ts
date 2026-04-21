// Meta / Facebook Ads Integration Helper
import { MetaMarketingApi as _MetaMarketingApi } from 'facebook-nodejs-business-sdk'

// Initialize Meta Marketing API
export function initMetaApi(accessToken: string) {
  // @ts-ignore - Meta SDK typing complexity
  _MetaMarketingApi.init(accessToken)
  // @ts-ignore
  return _MetaMarketingApi
}

// Get Ad Accounts
export async function getAdAccounts(accessToken: string) {
  const response = await fetch(
    `https://graph.facebook.com/v18.0/me/adaccounts?` +
    new URLSearchParams({
      access_token: accessToken,
      fields: 'id,name,account_status,currency,timezone',
    })
  )
  const data = await response.json()
  return data.data || []
}

// Get Campaigns
export async function getCampaigns(adAccountId: string, accessToken: string) {
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${adAccountId}/campaigns?` +
    new URLSearchParams({
      access_token: accessToken,
      fields: 'id,name,objective,status,daily_budget,lifetime_budget,start_time,end_time',
    })
  )
  const data = await response.json()
  return data.data || []
}

// Get Adsets
export async function getAdsets(campaignId: string, accessToken: string) {
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${campaignId}/adsets?` +
    new URLSearchParams({
      access_token: accessToken,
      fields: 'id,name,status,daily_budget,optimization_goal,targeting',
    })
  )
  const data = await response.json()
  return data.data || []
}

// Get Ads
export async function getAds(adsetId: string, accessToken: string) {
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${adsetId}/ads?` +
    new URLSearchParams({
      access_token: accessToken,
      fields: 'id,name,status,creative,adset_id',
    })
  )
  const data = await response.json()
  return data.data || []
}

// Get Ad Insights
export async function getAdInsights(adAccountId: string, accessToken: string, datePreset: string = 'last_30d') {
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${adAccountId}/insights?` +
    new URLSearchParams({
      access_token: accessToken,
      date_preset: datePreset,
      fields: 'campaign_name,adset_name,ad_name,impressions,clicks,spend,ctr,cpc,reach,frequency,actions,action_types',
    })
  )
  const data = await response.json()
  return data.data || []
}

// Get Campaign Performance
export async function getCampaignPerformance(campaignId: string, accessToken: string) {
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${campaignId}/insights?` +
    new URLSearchParams({
      access_token: accessToken,
      date_preset: 'last_30d',
      fields: 'impressions,reach,spend,clicks,ctr,cpc,actions,action_types,conversions',
    })
  )
  const data = await response.json()
  return data.data || []
}
