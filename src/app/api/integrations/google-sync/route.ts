import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { fetchGoogleCalendarEvents } from '@/lib/google-calendar'
import { logger } from '@/lib/server/logger'
import { createServiceClient } from '@/utils/supabase/service'

export async function GET() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const googleEvents = await fetchGoogleCalendarEvents(user.id)

    if (googleEvents.length > 0) {
      const adminSupabase = createServiceClient()

      for (const event of googleEvents) {
        const startAt = event.start?.dateTime || (event.start?.date ? new Date(event.start.date).toISOString() : null)
        if (!event.id || !startAt) continue

        const endAt = event.end?.dateTime || (event.end?.date ? new Date(event.end.date).toISOString() : null)

        await adminSupabase.from('calendar_events').upsert({
          gcal_event_id: event.id,
          user_id: user.id,
          title: event.summary || 'Sin título',
          start_at: startAt,
          end_at: endAt,
          meet_url: event.hangoutLink || null,
          source: 'google',
          deleted_at: null,
        }, {
          onConflict: 'user_id,gcal_event_id',
        })
      }
    }

    return NextResponse.json({ success: true, count: googleEvents.length })
  } catch (error) {
    logger.error('Manual Google Sync Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
