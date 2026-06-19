import { NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/service'
import { assertCronRequest } from '@/lib/server/cron-auth'
import { logger } from '@/lib/server/logger'

const TRASH_TABLES = ['tasks', 'expenses', 'meal_log', 'assignments', 'calendar_events']

/**
 * Cron endpoint: hard-deletes records with deleted_at older than 7 days.
 * Must be called with the Authorization: Bearer {CRON_SECRET} header.
 * Configure in vercel.json crons: daily at 03:00 UTC.
 */
export async function GET(req: Request) {
  const authError = assertCronRequest(req)
  if (authError) return authError

  try {
    const supabase = createServiceClient()
    const results: Record<string, number> = {}
    const failedTables: string[] = []

    for (const table of TRASH_TABLES) {
      const { count, error } = await supabase
        .from(table)
        .delete({ count: 'exact' })
        .lt('deleted_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

      if (error) {
        logger.error(`[cleanup-trash] Error deleting from ${table}:`, error.message)
        results[table] = -1
        failedTables.push(table)
      } else {
        results[table] = count ?? 0
      }
    }

    if (failedTables.length > 0) {
      return NextResponse.json(
        {
          error: 'No se pudo limpiar toda la papelera.',
          deleted: results,
          failedTables,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, deleted: results })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno'
    logger.error('[cleanup-trash] Unexpected error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
