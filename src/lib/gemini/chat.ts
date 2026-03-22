import { callGemini } from '@/lib/gemini/client'
import type { ChatMessage } from '@/types/ai'
import { createClient } from '@/utils/supabase/server'

const CHAT_SYSTEM_PROMPT = `Sos Acrue, un asistente personal inteligente. Tenés acceso a los datos reales del usuario y podés responder preguntas sobre sus tareas, calendario, finanzas, hábitos, y más. Respondé siempre en español, de forma concisa y útil.

REGLAS:
- Usá los datos del contexto provisto para responder preguntas específicas
- DEBES responder SIEMPRE con un objeto JSON válido con esta estructura estricta:
  {
    "message": "Texto en lenguaje natural para el usuario. Esta será la única respuesta visible.",
    "action": { // (Opcional, solo si el usuario pide crear/modificar algo)
      "type": "create_task", 
      "payload": { "title": "...", "priority": 1, "due_at": "YYYY-MM-DDTHH:MM:SSZ" }
    }
  }
- Si el usuario hace una pregunta normal que no requiere acciones, respondé usando la misma estructura JSON pero omitiendo el campo "action".
- NO devuelvas texto fuera del JSON. Todo el output debe ser parseable.
- No inventés datos que no estén en el contexto
- Sé conciso — máximo 3 párrafos cortos en el campo message
- Usá emojis con moderación para hacer las respuestas más amigables

INTERPRETACIÓN DE FECHAS EN CONSULTAS:
Hoy es {{FECHA_HOY}} ({{DIA_SEMANA}}).

Cuando el usuario hace una PREGUNTA sobre el pasado (verbos como "gasté", "comí", "hice", "tuve"):
- "el lunes", "el martes", etc. → el día más reciente que ya pasó
- "esta semana" → desde el lunes de esta semana hasta hoy
- "la semana pasada" → lunes al domingo de la semana anterior

Cuando el usuario da una INSTRUCCIÓN para el futuro (verbos como "agregá", "poné", "recordame"):
- "el lunes", "el martes", etc. → el próximo día mencionado que aún no llegó
- "mañana" → fecha de hoy + 1 día
- "pasado mañana" → fecha de hoy + 2 días

SEMANAS RELATIVAS (basándose en hoy: {{FECHA_HOY}}):
- "esta semana" → lunes al domingo de la semana actual
- "la semana que viene" / "la próxima semana" / "la semana próxima" → lunes al domingo de la semana siguiente (hoy + 7 días aprox.)
- "la próxima semana no, la otra" / "la semana que viene no, la otra" / "en dos semanas" → lunes al domingo de la semana en 2 semanas (hoy + 14 días aprox.)
- "la semana pasada" / "la semana anterior" → lunes al domingo de la semana anterior
- "hace dos semanas" → semana de hoy - 14 días`

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

  const systemInstruction = CHAT_SYSTEM_PROMPT
    .replace('{{FECHA_HOY}}', new Date().toISOString().split('T')[0])
    .replace('{{DIA_SEMANA}}', new Date().toLocaleDateString('es-AR', { weekday: 'long' }))

  const { text, error } = await callGemini(prompt, {
    systemInstruction,
    temperature: 0.7,
    maxOutputTokens: 512,
  })

  if (!text || error) {
    return {
      reply: '⚠️ La IA no está disponible en este momento. Intentá de nuevo en unos segundos.',
    }
  }

  // Parse the JSON response
  let replyMessage = text
  let action: Record<string, unknown> | undefined

  try {
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(jsonStr)
    if (parsed.message) {
      replyMessage = parsed.message
    }
    if (parsed.action) {
      action = parsed.action
    }
  } catch (e) {
    // Si Gemini ignoró la regla y devolvió texto plano
    replyMessage = text
  }

  return { reply: replyMessage, action }
}
