import { callGemini } from '@/lib/gemini/client'
import type { ChatMessage } from '@/types/ai'
import { createClient } from '@/utils/supabase/server'

const CHAT_SYSTEM_PROMPT = `Sos Acrue, un asistente personal inteligente. Tenés acceso a los datos reales del usuario y podés responder preguntas sobre sus tareas, calendario, finanzas, hábitos, y más. Respondé siempre en español, de forma concisa y útil.

REGLAS:
- Usá los datos del contexto provisto para responder preguntas específicas
- Si el usuario pide crear algo (tarea, evento, etc.), respondé con un JSON de acción: {"action": "create_task", "data": {...}}
- Si el usuario hace una pregunta, respondé directamente con texto natural
- No inventés datos que no estén en el contexto
- Sé conciso — máximo 3 párrafos cortos
- Usá emojis con moderación para hacer las respuestas más amigables`

const MAX_CONTEXT_ITEMS = 20

/**
 * Builds a compact snapshot of user data for the given modules.
 * Avoids sending the entire database to Gemini.
 */
export async function buildChatContext(
  userId: string,
  modules: string[]
): Promise<string> {
  const supabase = await createClient()
  const parts: string[] = []

  if (modules.includes('tareas') || modules.length === 0) {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('title, priority, status, due_at')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .neq('status', 'done')
      .order('due_at', { ascending: true })
      .limit(MAX_CONTEXT_ITEMS)

    if (tasks?.length) {
      parts.push(`📋 TAREAS PENDIENTES (${tasks.length}):`)
      tasks.forEach((t) => {
        const due = t.due_at ? ` — vence ${new Date(t.due_at).toLocaleDateString('es-AR')}` : ''
        const priorityLabel = t.priority === 1 ? 'URGENTE' : t.priority === 2 ? 'NORMAL' : 'BAJO'
        parts.push(`  • [${priorityLabel}] ${t.title}${due}`)
      })
    }
  }

  if (modules.includes('calendario') || modules.length === 0) {
    const now = new Date().toISOString()
    const inTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

    const { data: events } = await supabase
      .from('calendar_events')
      .select('title, starts_at, ends_at, location')
      .eq('user_id', userId)
      .gte('starts_at', now)
      .lte('starts_at', inTwoWeeks)
      .order('starts_at', { ascending: true })
      .limit(10)

    if (events?.length) {
      parts.push(`\n📅 PRÓXIMOS EVENTOS (próximas 2 semanas):`)
      events.forEach((e) => {
        const date = new Date(e.starts_at).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
        const time = new Date(e.starts_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
        parts.push(`  • ${date} a las ${time}: ${e.title}${e.location ? ` (${e.location})` : ''}`)
      })
    }
  }

  if (!parts.length) {
    return 'No hay datos disponibles para este contexto.'
  }

  return parts.join('\n')
}

/**
 * Sends a message to the AI chatbot with conversation history and user context.
 * Returns the text reply and any extracted action if the AI decides to execute one.
 */
export async function sendChatMessage(
  userId: string,
  message: string,
  history: ChatMessage[],
  modules: string[]
): Promise<{ reply: string; action?: Record<string, unknown> }> {
  const contextSnapshot = await buildChatContext(userId, modules)

  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Build conversation string for Gemini
  const historyText = history
    .slice(-10) // Last 10 messages to stay within token budget
    .map((m) => `${m.role === 'user' ? 'Usuario' : 'Acrue'}: ${m.content}`)
    .join('\n')

  const prompt = `FECHA HOY: ${today}

CONTEXTO DEL USUARIO:
${contextSnapshot}

HISTORIAL DE CONVERSACIÓN:
${historyText}

Usuario: ${message}
Acrue:`

  const { text, error } = await callGemini(prompt, {
    systemInstruction: CHAT_SYSTEM_PROMPT,
    temperature: 0.7,
    maxOutputTokens: 512,
  })

  if (!text || error) {
    return {
      reply: '⚠️ La IA no está disponible en este momento. Intentá de nuevo en unos segundos.',
    }
  }

  // Try to detect if the response contains an action JSON
  let action: Record<string, unknown> | undefined
  const actionMatch = text.match(/\{"action":\s*"[^"]+"/)  
  if (actionMatch) {
    try {
      const jsonText = text.match(/\{[\s\S]*\}/)?.[0]
      if (jsonText) action = JSON.parse(jsonText)
    } catch {
      // Not a valid JSON action, treat as plain text
    }
  }

  return { reply: text, action }
}
