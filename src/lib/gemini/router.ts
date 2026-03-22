import { callGemini } from '@/lib/gemini/client'
import type { IntentResult, IntentType } from '@/types/ai'

const INTENT_SYSTEM_PROMPT = `Sos el router de intenciones de Acrue, una app de productividad personal.

Tu trabajo es analizar el texto del usuario y devolver SIEMPRE un JSON con esta estructura exacta:
{
  "intent": "create_task" | "create_expense" | "create_event" | "create_habit" | "create_note" | "create_project" | "add_wishlist_item",
  "confidence": 0.95,
  "payload": { ... datos relevantes ... }
}

REGLAS DE CONFIANZA:
- Si la intención es clara y no hay ambigüedad → confidence: 0.95
- Si hay leve ambigüedad → confidence: 0.75
- Solo usa confidence bajo si genuinamente no podés determinar la intención

EJEMPLOS:
- "Gasté 4800 en el súper" → { intent: "create_expense", confidence: 0.95, payload: { amount: 4800, description: "supermercado", date: "hoy" } }
- "Tarea de lengua para pasado mañana, prioridad alta" → { intent: "create_task", confidence: 0.95, payload: { title: "Tarea de lengua", due_date: "pasado mañana", priority: 1 } }

IMPORTANTE:
- Respondé SOLO con el JSON, sin texto adicional, sin markdown, sin backticks
- El campo confidence SIEMPRE debe ser un número entre 0 y 1, nunca 0 exacto salvo que sea imposible detectar la intención
- Para fechas relativas como "mañana", "pasado mañana", "el viernes", calculá la fecha real basándote en hoy: {{FECHA_HOY}}`

/**
 * Detects the intent of a natural language input using Gemini.
 * Returns a structured object with intent type, confidence score, and data payload.
 */
export async function detectIntent(text: string): Promise<IntentResult | null> {
  const today = new Date().toISOString().split('T')[0]
  const systemInstruction = INTENT_SYSTEM_PROMPT.replace('{{FECHA_HOY}}', today)

  const { text: raw, error } = await callGemini(text, {
    systemInstruction,
    temperature: 0.1, // Low temperature for consistent structured output
    maxOutputTokens: 512,
  })

  if (!raw || error) {
    console.error('[detectIntent] Gemini call failed:', error)
    return null
  }

  // Strip any accidental markdown fences
  let cleaned = raw.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()
  console.log('Gemini raw response:', raw)

  let parsed
  try {
    parsed = JSON.parse(cleaned)
  } catch (parseErr) {
    console.error('Router parse error. Raw response:', raw)
    return {
      intent: 'desconocido',
      confidence: 0,
      payload: {},
      rawText: text,
    }
  }

  return {
    intent: (parsed.intent ?? 'desconocido') as IntentType,
    confidence: Number(parsed.confidence ?? 0),
    payload: parsed.payload ?? {},
    rawText: text,
  }
}
