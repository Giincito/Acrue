import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { detectIntent } from '@/lib/gemini/router'
import { executeAiAction } from '@/lib/gemini/actions'
import type { RouterResponse } from '@/types/ai'
import { logger } from '@/lib/server/logger'

const CONFIDENCE_THRESHOLD = 0.90

export async function POST(req: Request) {
  try {
    const supabase = await createClient()

    let userId: string | null = null

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!authError && user) {
        userId = user.id
    }

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { text } = await req.json() as { text: string }
    if (!text?.trim()) {
      return NextResponse.json({ error: 'Texto requerido' }, { status: 400 })
    }

    const result = await detectIntent(text)

    if (!result) {
      return NextResponse.json<RouterResponse>({
        executed: false,
        message: 'IA no disponible. Podés usar los formularios directamente.',
        confidence: 0,
      })
    }

    const { intent, confidence, payload } = result

    if (intent === 'search_cerebro') {
      return NextResponse.json<RouterResponse>({
        executed: false,
        message: 'Abriendo Cerebro.',
        preview: payload,
        intent,
        confidence,
      })
    }

    // ── LOW CONFIDENCE ── Return preview for manual confirmation
    if (confidence <= CONFIDENCE_THRESHOLD || intent === 'desconocido') {
      return NextResponse.json<RouterResponse>({
        executed: false,
        message: 'Necesito confirmación antes de guardar',
        preview: payload,
        intent,
        confidence,
      })
    }

    // ── HIGH CONFIDENCE ── Execute using shared logic
    const { success, message, recordId, undoId } = await executeAiAction(userId, {
        type: intent,
        payload
    }, supabase)

    if (!success) {
        return NextResponse.json<RouterResponse>({
            executed: false,
            message: message || 'Error al ejecutar la acción',
            intent,
            confidence
        })
    }

    return NextResponse.json<RouterResponse & { action_result: { success: boolean; id?: string } }>({
      executed: true,
      message: `✓ ${message}`,
      recordId,
      undoId,
      intent,
      confidence,
      action_result: { success: true, id: recordId }
    })
  } catch (err: unknown) {
    logger.error('[ai/router] Unexpected error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
