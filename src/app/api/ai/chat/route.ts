import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { sendChatMessage } from '@/lib/gemini/chat'
import { executeAiAction } from '@/lib/gemini/actions'
import type { ChatMessage } from '@/types/ai'
import { logger } from '@/lib/server/logger'

function isExecutableAiAction(action: Record<string, unknown>): action is { type: string; payload: unknown } {
  return typeof action.type === 'string' && 'payload' in action
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { message, history, modules } = await req.json() as {
      message: string
      history: ChatMessage[]
      modules: string[]
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 })
    }

    const { reply, action } = await sendChatMessage(
      user.id,
      message,
      history ?? [],
      modules ?? [] // empty = all modules
    )

    let actionId: string | undefined
    let undoId: string | undefined
    let actionMessage: string | undefined
    let actionSuccess: boolean | undefined

    if (action) {
      if (isExecutableAiAction(action)) {
        const result = await executeAiAction(user.id, action, supabase)
        actionSuccess = result.success
        actionMessage = result.message
        actionId = result.recordId
        undoId = result.undoId
      } else {
        actionSuccess = false
        actionMessage = 'La acción detectada no tiene un formato válido.'
      }
    }

    return NextResponse.json({ reply, actionId, undoId, actionMessage, actionSuccess })
  } catch (err: unknown) {
    logger.error('[api/ai/chat] Unexpected error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
