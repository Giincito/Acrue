import { google } from 'googleapis'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const host = req.headers.get('host') || 'localhost:3001'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${baseUrl}/api/auth/google/callback`
  )

  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/tasks'
  ]

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent' // Forces refresh token generation
  })

  return NextResponse.redirect(authUrl)
}
