import { google } from 'googleapis'
import { withFallback } from '@/lib/integrations/resilience'
import { logger } from '@/lib/server/logger'
import { createServiceClient } from '@/utils/supabase/service'

type GoogleAuthClient = InstanceType<typeof google.auth.OAuth2>

interface GoogleCalendarEventInput {
  title: string
  description?: string | null
  start_at: string
  end_at?: string | null
  is_all_day?: boolean | null
  color?: string | null
}

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
)

async function getGoogleRefreshToken(userId: string): Promise<string | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('google_integrations')
    .select('refresh_token')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data?.refresh_token) {
    logger.warn('No Google Refresh Token found for integration')
    return null
  }

  return data.refresh_token
}

export async function getOrCreateAcrueCalendar(authClient: GoogleAuthClient): Promise<string> {
  const result = await withFallback(
    async () => {
      const calendar = google.calendar({ version: 'v3', auth: authClient })
      const listRes = await calendar.calendarList.list()
      const calendars = listRes.data.items || []

      const acrueCalendar = calendars.find((c) => c.summary === 'Acrue')
      if (acrueCalendar?.id) {
        return acrueCalendar.id
      }

      const insertRes = await calendar.calendars.insert({
        requestBody: {
          summary: 'Acrue',
          description: 'Tareas y Eventos sincronizados desde tu tablero de Acrue.',
        },
      })

      return insertRes.data.id || 'primary'
    },
    'primary'
  )

  return result.data
}

export async function fetchGoogleCalendarEvents(userId: string) {
  const result = await withFallback(
    async () => {
      const refreshToken = await getGoogleRefreshToken(userId)

      if (!refreshToken) {
        return []
      }

      oauth2Client.setCredentials({ refresh_token: refreshToken })
      const calendarId = await getOrCreateAcrueCalendar(oauth2Client)
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const response = await calendar.events.list({
        calendarId: calendarId,
        timeMin: thirtyDaysAgo.toISOString(),
        maxResults: 250,
        singleEvents: true,
        orderBy: 'startTime',
      })

      return response.data.items || []
    },
    [],
    `google-calendar:events:${userId}`,
    1800
  )

  return result.data
}

export async function pushGoogleCalendarEvent(userId: string, eventData: GoogleCalendarEventInput) {
  const result = await withFallback<string | null>(
    async () => {
      const refreshToken = await getGoogleRefreshToken(userId)

      if (!refreshToken) return null
      oauth2Client.setCredentials({ refresh_token: refreshToken })

      const calendarId = await getOrCreateAcrueCalendar(oauth2Client)
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

      const response = await calendar.events.insert({
        calendarId: calendarId,
        requestBody: {
          summary: eventData.title,
          description: eventData.description || '',
          start: eventData.is_all_day ? { date: eventData.start_at.split('T')[0] } : { dateTime: eventData.start_at },
          end: eventData.is_all_day
            ? { date: eventData.end_at ? eventData.end_at.split('T')[0] : eventData.start_at.split('T')[0] }
            : { dateTime: eventData.end_at || eventData.start_at },
          colorId: eventData.color ? '9' : undefined // Basic color mapping if needed
        }
      })

      return response.data.id ?? null
    },
    null
  )

  return result.data
}

export async function updateGoogleCalendarEvent(userId: string, gcalEventId: string, eventData: GoogleCalendarEventInput) {
  const result = await withFallback(
    async () => {
      const refreshToken = await getGoogleRefreshToken(userId)

      if (!refreshToken) return null
      oauth2Client.setCredentials({ refresh_token: refreshToken })

      const calendarId = await getOrCreateAcrueCalendar(oauth2Client)
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

      await calendar.events.update({
        calendarId: calendarId,
        eventId: gcalEventId,
        requestBody: {
          summary: eventData.title,
          description: eventData.description || '',
          start: eventData.is_all_day ? { date: eventData.start_at.split('T')[0] } : { dateTime: eventData.start_at },
          end: eventData.is_all_day
            ? { date: eventData.end_at ? eventData.end_at.split('T')[0] : eventData.start_at.split('T')[0] }
            : { dateTime: eventData.end_at || eventData.start_at }
        }
      })
      return true
    },
    false
  )

  return result.data
}

export async function deleteGoogleCalendarEvent(userId: string, gcalEventId: string) {
  const result = await withFallback(
    async () => {
      const refreshToken = await getGoogleRefreshToken(userId)

      if (!refreshToken) return null
      oauth2Client.setCredentials({ refresh_token: refreshToken })

      const calendarId = await getOrCreateAcrueCalendar(oauth2Client)
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

      await calendar.events.delete({
        calendarId: calendarId,
        eventId: gcalEventId,
      })
      return true
    },
    false
  )

  return result.data
}
