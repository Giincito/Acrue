import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
)

export async function getOrCreateAcrueCalendar(authClient: any): Promise<string> {
  const calendar = google.calendar({ version: 'v3', auth: authClient });
  
  try {
    const listRes = await calendar.calendarList.list();
    const calendars = listRes.data.items || [];
    
    const acrueCalendar = calendars.find(c => c.summary === 'Acrue');
    if (acrueCalendar && acrueCalendar.id) {
      return acrueCalendar.id;
    }

    const insertRes = await calendar.calendars.insert({
      requestBody: {
        summary: 'Acrue',
        description: 'Tareas y Eventos sincronizados desde tu tablero de Acrue.'
      }
    });

    return insertRes.data.id || 'primary';
  } catch (error) {
    console.error('getOrCreateAcrueCalendar failed:', error);
    return 'primary'; // Fallback
  }
}

export async function fetchGoogleCalendarEvents(userId: string) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // For Google Calendar, we check a theoretical user_integrations table 
    // where refresh tokens for Google are stored.
    const { data: user, error } = await supabase
      .from('users')
      .select('settings')
      .eq('id', userId)
      .single()

    const refreshToken = user?.settings?.google_refresh_token

    if (error || !refreshToken) {
      console.warn('No Google Refresh Token found for integration')
      return []
    }

    oauth2Client.setCredentials({ refresh_token: refreshToken })
    const calendarId = await getOrCreateAcrueCalendar(oauth2Client)
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    const response = await calendar.events.list({
      calendarId: calendarId,
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

export async function pushGoogleCalendarEvent(userId: string, eventData: any) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: user } = await supabase.from('users').select('settings').eq('id', userId).single()
    const refreshToken = user?.settings?.google_refresh_token

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

    return response.data.id

  } catch (error) {
    console.error('pushGoogleCalendarEvent fail:', error)
    return null
  }
}

export async function updateGoogleCalendarEvent(userId: string, gcalEventId: string, eventData: any) {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: user } = await supabase.from('users').select('settings').eq('id', userId).single()
    const refreshToken = user?.settings?.google_refresh_token

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
  } catch (error) {
    console.error('updateGoogleCalendarEvent fail:', error)
    return false
  }
}

export async function deleteGoogleCalendarEvent(userId: string, gcalEventId: string) {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: user } = await supabase.from('users').select('settings').eq('id', userId).single()
    const refreshToken = user?.settings?.google_refresh_token

    if (!refreshToken) return null
    oauth2Client.setCredentials({ refresh_token: refreshToken })
    
    const calendarId = await getOrCreateAcrueCalendar(oauth2Client)
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    
    await calendar.events.delete({
      calendarId: calendarId,
      eventId: gcalEventId,
    })
    return true
  } catch (error) {
    console.error('deleteGoogleCalendarEvent fail:', error)
    return false
  }
}
