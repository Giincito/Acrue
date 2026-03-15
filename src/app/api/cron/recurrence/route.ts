import { createClient } from '@supabase/supabase-js'
import { RRule } from 'rrule'

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // We need this in prod for bypass RLS

    // For local dev, we might fallback to Anon if service is not present (although RLS blocks it)
    // Best practice is to set SUPABASE_SERVICE_ROLE_KEY in `.env.local`
    const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    // Fetch all active recurring tasks
    const { data: recurringTasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('is_recurring', true)
      .is('deleted_at', null)

    if (error) throw error

    let insertedCount = 0

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (const task of recurringTasks) {
      if (!task.recurrence_rule) continue

      try {
        const rule = RRule.fromString(task.recurrence_rule)
        
        // We look for occurrences today. In a real system, we'd store a `last_generated_date`
        // or shift the `due_at` date of the original task.
        // For standard cron logic: we check if today matches the recurrence rule of the original due_at.
        
        const originalDue = task.due_at ? new Date(task.due_at) : new Date(task.created_at)
        const dtstart = new Date(Date.UTC(originalDue.getFullYear(), originalDue.getMonth(), originalDue.getDate()))
        const ruleWithStart = new RRule({
            ...rule.options,
            dtstart,
        })

        const occurrences = ruleWithStart.between(today, new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1))
        
        if (occurrences.length > 0) {
          // It repeats today, and it hasn't been generated yet (simplified logic)
          // We would create a new instance IF it's not the original day itself.
          
          if (today.getTime() !== dtstart.getTime()) {
            await supabase.from('tasks').insert({
              user_id: task.user_id,
              title: task.title,
              context_tag: task.context_tag,
              status: 'today', // Pop directly into today
              priority: task.priority,
              due_at: today.toISOString(),
              project_id: task.project_id,
              is_recurring: false, // The clone isn't recurring, just an instance. (Alternatively, the master moves date).
              recurrence_rule: null
            })
            insertedCount++
          }
        }

      } catch (err) {
        console.error(`Failed parsing rule for task ${task.id}`, err)
      }
    }

    return new Response(JSON.stringify({ success: true, count: insertedCount }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(error.message, { status: 500 })
  }
}
