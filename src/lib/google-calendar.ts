import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_OAUTH_ID,
  process.env.GOOGLE_OAUTH_SECRET,
  `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
)

export async function fetchGoogleCalendarEvents(userId: string) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // For Google Calendar, we check a theoretical user_integrations table 
    // where refresh tokens for Google are stored.
    const { data: integration, error } = await supabase
      .from('user_integrations')
      .select('refresh_token')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .single()

    if (error || !integration?.refresh_token) {
      console.warn('No Google Refresh Token found for integration')
      return []
    }

    oauth2Client.setCredentials({ refresh_token: integration.refresh_token })
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    })

    return response.data.items || []

  } catch (error) {
    console.error('withFallback[google-calendar]: API failed, returning empty array.', error)
    return []
  }
}
