import { createClient } from '@supabase/supabase-js'
import { fetchGoogleCalendarEvents } from '@/lib/google-calendar'

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    // Fetch users with google_refresh_token
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, settings')
      .not('settings', 'is', null)

    if (usersError) throw usersError

    let syncedCount = 0

    for (const user of users) {
      if (!user.settings?.google_refresh_token) continue

      const events = await fetchGoogleCalendarEvents(user.id)
      
      for (const ev of events) {
         if (!ev.id || !ev.summary || (!ev.start?.dateTime && !ev.start?.date)) continue

         const startAt = ev.start.dateTime || new Date(ev.start.date!).toISOString()
         const endAt = ev.end?.dateTime || (ev.end?.date ? new Date(ev.end.date).toISOString() : null)

         // check existing
         const { data: existing } = await supabase.from('calendar_events')
           .select('id').eq('gcal_event_id', ev.id).maybeSingle()

         if (existing) {
           await supabase.from('calendar_events').update({
             title: ev.summary,
             start_at: startAt,
             end_at: endAt,
             meet_url: ev.hangoutLink || null,
           }).eq('id', existing.id)
         } else {
           await supabase.from('calendar_events').insert({
             user_id: user.id,
             title: ev.summary,
             start_at: startAt,
             end_at: endAt,
             gcal_event_id: ev.id,
             meet_url: ev.hangoutLink || null,
             source: 'google'
           })
         }
         syncedCount++
      }
    }

    return new Response(JSON.stringify({ success: true, count: syncedCount }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(error.message, { status: 500 })
  }
}
