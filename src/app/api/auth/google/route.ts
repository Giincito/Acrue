import { google } from 'googleapis'
import { NextResponse } from 'next/server'
import { getGoogleOAuthRedirectUri } from '@/lib/google-oauth'

export async function GET(req: Request) {
  const redirectUri = getGoogleOAuthRedirectUri(req)

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  )

  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/tasks',
    'https://www.googleapis.com/auth/gmail.readonly'
  ]

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent' // Forces refresh token generation
  })

  return NextResponse.redirect(authUrl)
}
