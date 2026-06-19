import { fetchGoogleCalendarEvents } from '@/lib/google-calendar'
import { assertCronRequest } from '@/lib/server/cron-auth'
import { createServiceClient } from '@/utils/supabase/service'

export async function GET(req: Request) {
  try {
    const authError = assertCronRequest(req)
    if (authError) return authError

    const supabase = createServiceClient()

    const { data: integrations, error: integrationsError } = await supabase
      .from('google_integrations')
      .select('user_id')

    if (integrationsError) throw integrationsError

    let syncedCount = 0

    for (const integration of integrations) {
      const events = await fetchGoogleCalendarEvents(integration.user_id)
      
      for (const ev of events) {
         if (!ev.id || !ev.summary || (!ev.start?.dateTime && !ev.start?.date)) continue

         const startAt = ev.start.dateTime || new Date(ev.start.date!).toISOString()
         const endAt = ev.end?.dateTime || (ev.end?.date ? new Date(ev.end.date).toISOString() : null)

         // check existing
         const { data: existing } = await supabase.from('calendar_events')
           .select('id').eq('user_id', integration.user_id).eq('gcal_event_id', ev.id).maybeSingle()

         if (existing) {
           await supabase.from('calendar_events').update({
             title: ev.summary,
             start_at: startAt,
             end_at: endAt,
             meet_url: ev.hangoutLink || null,
             deleted_at: null,
           }).eq('id', existing.id)
         } else {
           await supabase.from('calendar_events').insert({
             user_id: integration.user_id,
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

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno'
    return new Response(message, { status: 500 })
  }
}
