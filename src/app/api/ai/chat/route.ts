import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { sendChatMessage } from '@/lib/gemini/chat'
import type { ChatMessage } from '@/types/ai'

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

    if (action && action.type === 'create_task' && action.payload) {
      const payload = action.payload as any
      const { error: insertError } = await supabase.from('tasks').insert({
        user_id: user.id,
        title: payload.title,
        description: payload.description || null,
        priority: payload.priority || 2,
        due_at: payload.due_at || null,
        status: 'inbox'
      })
      if (insertError) {
        console.error('[api/ai/chat] Error procesando accion create_task:', insertError)
      }
    }

    // Devolver solo reply para que el JSON nunca sea visible
    return NextResponse.json({ reply })
  } catch (err: any) {
    console.error('[api/ai/chat] Unexpected error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
