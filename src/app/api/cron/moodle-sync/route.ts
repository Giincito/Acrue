import { NextResponse } from 'next/server'
import { assertCronRequest } from '@/lib/server/cron-auth'
import { syncMoodleUsers } from '@/lib/moodle/sync'

/**
 * Cron job: Moodle UNICEN sync every 2 hours.
 */
export async function GET(request: Request) {
  const authError = assertCronRequest(request)
  if (authError) return authError

  try {
    const result = await syncMoodleUsers()
    return NextResponse.json(result)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
