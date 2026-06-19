import { NextResponse } from 'next/server'
import { indexNotebook } from '@/lib/cerebro/indexing'
import { logger } from '@/lib/server/logger'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const result = await indexNotebook(supabase, user.id, body)

    return NextResponse.json(result)
  } catch (error) {
    logger.error('[api/cerebro/index] Unexpected error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error interno del servidor',
    }, { status: 500 })
  }
}
