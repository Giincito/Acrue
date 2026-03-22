import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const TRASH_TABLES = ['tasks', 'expenses', 'meal_log', 'assignments']

/**
 * Cron endpoint: hard-deletes records with deleted_at older than 7 days.
 * Must be called with the Authorization: Bearer {CRON_SECRET} header.
 * Configure in vercel.json crons: daily at 03:00 UTC.
 */
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = await createClient()
    const results: Record<string, number> = {}

    for (const table of TRASH_TABLES) {
      const { count, error } = await supabase
        .from(table)
        .delete({ count: 'exact' })
        .lt('deleted_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

      if (error) {
        console.error(`[cleanup-trash] Error deleting from ${table}:`, error.message)
        results[table] = -1
      } else {
        results[table] = count ?? 0
      }
    }

    console.log('[cleanup-trash] Results:', results)
    return NextResponse.json({ success: true, deleted: results })
  } catch (err: any) {
    console.error('[cleanup-trash] Unexpected error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
