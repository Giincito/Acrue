import { predictMonthEnd } from '@/lib/finanzas/predictions'
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/server/logger'

/**
 * GET /api/finanzas/prediction
 * Returns month-end balance prediction based on current spending patterns.
 * Returns 204 when no data available (graceful degradation).
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const prediction = await predictMonthEnd(user.id, supabase)
    return NextResponse.json(prediction)
  } catch (err) {
    logger.error('[api/finanzas/prediction] Error:', err)
    return new NextResponse(null, { status: 204 })
  }
}
