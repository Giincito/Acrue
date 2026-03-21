import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { fetchGoogleCalendarEvents } from '@/lib/google-calendar'

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
            // This can be ignored if you have middleware refreshing
            // user sessions.
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
    // 1. Fetch events from the internal Acrue Google Calendar
    const googleEvents = await fetchGoogleCalendarEvents(user.id)
    
    // We only process if there are events, otherwise just send a 200 OK
    if (googleEvents && googleEvents.length > 0) {
      
      const adminSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          cookies: { getAll() { return [] }, setAll() {} }
        }
      )
      
      for (const event of googleEvents) {
        // We ensure we have an email or generic creator
        const userEmail = event.creator?.email || 'unknown@google.com'
        
        // Upsert into our generic calendar_events
        await adminSupabase.from('calendar_events').upsert({
          gcal_id: event.id,
          user_id: user.id, // Bind it strictly to the requesting user
          user_email: userEmail,
          title: event.summary || 'Sin Título',
          start_time: event.start?.dateTime || event.start?.date || new Date().toISOString(),
          end_time: event.end?.dateTime || event.end?.date || new Date().toISOString(),
          status: event.status || 'confirmed',
          link: event.htmlLink || null
        }, {
          onConflict: 'gcal_id'
        })
      }
    }
    
    return NextResponse.json({ success: true, count: googleEvents.length || 0 })
    
  } catch (error) {
    console.error('Manual Google Sync Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
