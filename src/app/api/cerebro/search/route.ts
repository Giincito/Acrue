import { NextResponse } from 'next/server'
import { generateEmbedding } from '@/lib/cerebro/embeddings'
import { searchSimilar } from '@/lib/cerebro/indexing'
import { logger } from '@/lib/server/logger'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { query, limit } = await req.json() as { query?: string; limit?: number }
    if (!query?.trim()) {
      return NextResponse.json({ error: 'Consulta requerida' }, { status: 400 })
    }

    const embedding = await generateEmbedding(query)
    const results = await searchSimilar(supabase, user.id, embedding, limit ?? 6)

    return NextResponse.json({ results })
  } catch (error) {
    logger.error('[api/cerebro/search] Unexpected error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error interno del servidor',
    }, { status: 500 })
  }
}
