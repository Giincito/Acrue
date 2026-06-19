import { assertCronRequest } from '@/lib/server/cron-auth'
import { logger } from '@/lib/server/logger'
import { buildRecurringTaskInstance, getRecurrenceDateKey } from '@/lib/utils/recurrence'
import { createServiceClient } from '@/utils/supabase/service'

export async function GET(req: Request) {
  return generateRecurringTasks(req)
}

export async function POST(req: Request) {
  return generateRecurringTasks(req)
}

async function generateRecurringTasks(req: Request) {
  try {
    const authError = assertCronRequest(req)
    if (authError) return authError

    const supabase = createServiceClient()

    const { data: recurringTasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('is_recurring', true)
      .is('deleted_at', null)

    if (error) throw error

    const targetDate = new Date()
    const occurrenceDate = getRecurrenceDateKey(targetDate)
    const { data: existingInstances, error: existingError } = await supabase
      .from('tasks')
      .select('metadata')
      .eq('source', 'recurrence')
      .eq('metadata->>recurrence_occurrence_date', occurrenceDate)
      .is('deleted_at', null)

    if (existingError) throw existingError

    const existingKeys = new Set(
      (existingInstances ?? []).flatMap((task) => {
        const metadata = toPlainMetadata(task.metadata)
        const sourceTaskId = metadata.recurrence_source_task_id
        const occurrence = metadata.recurrence_occurrence_date

        return typeof sourceTaskId === 'string' && typeof occurrence === 'string'
          ? [`${sourceTaskId}:${occurrence}`]
          : []
      })
    )

    let insertedCount = 0

    for (const task of recurringTasks ?? []) {
      const instance = buildRecurringTaskInstance(task, targetDate, existingKeys)
      if (!instance) continue

      const { error: insertError } = await supabase.from('tasks').insert(instance)

      if (insertError) {
        logger.error(`Failed generating recurring task ${task.id}`, insertError)
        continue
      }

      insertedCount++
      existingKeys.add(`${task.id}:${occurrenceDate}`)
    }

    return new Response(JSON.stringify({ success: true, count: insertedCount }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno'
    return new Response(message, { status: 500 })
  }
}

function toPlainMetadata(metadata: unknown): Record<string, unknown> {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? { ...metadata }
    : {}
}
