import { NextResponse } from 'next/server'
import { cleanupNotebookEmbeddings } from '@/lib/cerebro/indexing'
import { logger } from '@/lib/server/logger'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { notebookId, noteId } = await req.json() as { notebookId?: string; noteId?: string | null }
    if (!notebookId?.trim()) {
      return NextResponse.json({ error: 'Notebook requerido' }, { status: 400 })
    }

    const result = await cleanupNotebookEmbeddings(supabase, user.id, { notebookId, noteId })
    return NextResponse.json(result)
  } catch (error) {
    logger.error('[api/cerebro/cleanup] Unexpected error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error interno del servidor',
    }, { status: 500 })
  }
}
