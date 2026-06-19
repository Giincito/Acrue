import { getDollarRate } from '@/lib/finanzas/dolar'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/server/logger'

/**
 * GET /api/finanzas/dolar
 * Returns the current blue dollar rate with Redis caching.
 * Graceful degradation: returns null data when rate is unavailable.
 */
export async function GET() {
  try {
    const result = await getDollarRate()
    return NextResponse.json(result)
  } catch (err) {
    logger.error('[api/finanzas/dolar] Unexpected error:', err)
    return NextResponse.json({ data: null, fromCache: false, error: 'Error interno' })
  }
}
