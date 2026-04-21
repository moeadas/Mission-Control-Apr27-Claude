// Google Integrations Helper
import { google } from 'googleapis'

// Create OAuth2 client
export function getGoogleOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
}

// Google Docs - Read document
export async function readGoogleDoc(docId: string, auth: any) {
  const docs = google.docs({ version: 'v1', auth })
  const response = await docs.documents.get({ documentId: docId })
  return response.data
}

// Google Docs - Create document
export async function createGoogleDoc(title: string, content: string, auth: any) {
  const docs = google.docs({ version: 'v1', auth })
  
  const response = await docs.documents.create({
    requestBody: {
      title,
    },
  })

  const docId = response.data.documentId
  
  if (docId && content) {
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: {
        requests: [{
          insertText: {
            location: { index: 1 },
            text: content,
          },
        }],
      },
    })
  }

  return response.data
}

// Google Sheets - Read spreadsheet
export async function readGoogleSheet(sheetId: string, range: string, auth: any) {
  const sheets = google.sheets({ version: 'v4', auth })
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  })
  return response.data.values
}

// Google Sheets - Update spreadsheet
export async function updateGoogleSheet(sheetId: string, range: string, values: any[][], auth: any) {
  const sheets = google.sheets({ version: 'v4', auth })
  const response = await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: {
      values,
    },
  })
  return response.data
}

// Google Ads - Get campaign data
export async function getGoogleAdsData(customerId: string, auth: any) {
  // @ts-ignore - Google Ads API library typing issue
  const ads = google.ads({ version: 'v1', auth })
  
  // Get campaigns
  const campaigns = await ads.campaigns.list({
    customerId,
  })

  // Get ad groups
  const adGroups = await ads.adGroups.list({
    customerId,
  })

  // Get keywords
  const keywords = await ads.keywords.list({
    customerId,
  })

  return {
    campaigns: campaigns.data,
    adGroups: adGroups.data,
    keywords: keywords.data,
  }
}
