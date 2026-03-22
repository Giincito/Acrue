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

    let actionId: string | undefined

    if (action) {
      try {
        switch (action.type) {
          case 'create_task': {
            const payload = action.payload as any
            const dueRaw = payload.due_at || payload.due_date;
            const parsedDueAt = dueRaw 
              ? (dueRaw.length === 10 ? dueRaw + 'T12:00:00-03:00' : dueRaw.includes('T00:00:00') ? dueRaw.split('T')[0] + 'T12:00:00-03:00' : dueRaw) 
              : null;
            const { data, error: insertError } = await supabase.from('tasks').insert({
              user_id: user.id,
              title: payload.title || payload.description || 'Nueva tarea',
              due_at: parsedDueAt,
              priority: payload.priority === 'ALTA' ? 1 : payload.priority === 'MEDIA' ? 2 : typeof payload.priority === 'number' ? payload.priority : 3,
              status: 'inbox',
              source: 'chatbot'
            }).select('id').single()
            
            if (insertError) console.error('[api/ai/chat] Error procesando create_task:', insertError)
            if (data) actionId = data.id
            break
          }
          case 'create_reminder': {
            const payload = action.payload as any
            const triggerRaw = payload.trigger_at || payload.due_date || payload.time;
            const parsedTriggerAt = triggerRaw
              ? (triggerRaw.length === 10 ? triggerRaw + 'T12:00:00-03:00' : triggerRaw.includes('T00:00:00') ? triggerRaw.split('T')[0] + 'T12:00:00-03:00' : triggerRaw)
              : new Date().toISOString();
            const { data, error: insertError } = await supabase.from('reminders').insert({
              user_id: user.id,
              title: payload.title || payload.description || 'Nuevo recordatorio',
              trigger_at: parsedTriggerAt,
              is_completed: false,
              source: 'chatbot'
            }).select('id').single()
            
            if (insertError) console.error('[api/ai/chat] Error procesando create_reminder:', insertError)
            if (data) actionId = data.id
            break
          }
        }
      } catch (e) {
        console.error('[api/ai/chat] Excepcion ejecutando accion:', e)
      }
    }

    // Devolver solo reply para que el JSON nunca sea visible, junto con actionId
    return NextResponse.json({ reply, actionId })
  } catch (err: any) {
    console.error('[api/ai/chat] Unexpected error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
