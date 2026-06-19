import { callGemini } from '@/lib/gemini/client'
import type { IntentResult, IntentType } from '@/types/ai'
import { logger } from '@/lib/server/logger'

const INTENT_SYSTEM_PROMPT = `Sos el router de intenciones de Acrue, una app de productividad personal.

Tu trabajo es analizar el texto del usuario y devolver SIEMPRE un JSON con esta estructura exacta:
{
  "intent": "create_task" | "create_expense" | "create_event" | "create_habit" | "create_note" | "create_project" | "add_wishlist_item" | "create_debt" | "create_recipe" | "log_meal" | "add_pantry_item" | "add_to_shopping_list" | "search_cerebro",
  "confidence": 0.95,
  "payload": { ... datos relevantes ... }
}

REGLAS DE CONFIANZA:
- Si la intención es clara y no hay ambigüedad → confidence: 0.95
- Si hay leve ambigüedad → confidence: 0.75
- Solo usa confidence bajo si genuinamente no podés determinar la intención

EJEMPLOS:
- "Gasté 4800 en el súper" → { intent: "create_expense", confidence: 0.95, payload: { amount: 4800, description: "supermercado", date: "hoy", suggested_category: "Supermercado" } }
- "Tarea de lengua para pasado mañana, prioridad alta" → { intent: "create_task", confidence: 0.95, payload: { title: "Tarea de lengua", due_date: "pasado mañana", priority: 1 } }
- "Marcos me debe 5000 pesos de la cena" → { intent: "create_debt", confidence: 0.95, payload: { name: "Cena", person: "Marcos", type: "owed_to_me", amount: 5000 } }
- "Le debo a Juan 3000 del uber" → { intent: "create_debt", confidence: 0.95, payload: { name: "Uber", person: "Juan", type: "i_owe", amount: 3000 } }
- "Agregá una receta de pasta con salsa" → { intent: "create_recipe", confidence: 0.95, payload: { name: "Pasta con salsa", instructions: "Cocinar la pasta y preparar la salsa..." } }
- "Comí pasta anoche" → { intent: "log_meal", confidence: 0.95, payload: { description: "Pasta", meal_type: "cena", calories: 450 } }
- "Agregué 2kg de arroz" → { intent: "add_pantry_item", confidence: 0.95, payload: { name: "Arroz", quantity: 2, unit: "kg" } }
- "Necesito comprar leche" → { intent: "add_to_shopping_list", confidence: 0.95, payload: { name: "Leche", quantity: 1, unit: "l" } }
- "@cerebro sistemas distribuidos" → { intent: "search_cerebro", confidence: 0.95, payload: { query: "sistemas distribuidos" } }
- "¿qué anotamos sobre raft?" → { intent: "search_cerebro", confidence: 0.90, payload: { query: "raft" } }

CATEGORIZACIÓN AUTOMÁTICA DE GASTOS:
Cuando la intención sea "create_expense", incluí un campo "suggested_category" en el payload basándote en estas reglas:
- Supermercado: súper, supermercado, coto, dia, carrefour, jumbo, vea, verdulería, almacén
- Transporte: uber, taxi, bondi, sube, nafta, estacionamiento, peaje, colectivo, tren, subte
- Servicios: luz, gas, agua, internet, teléfono, celular
- Salud: farmacia, médico, hospital, remedios, consulta
- Educación: libro, curso, universidad, cuota, fotocopia
- Entretenimiento: cine, netflix, spotify, juego, teatro, concierto
- Restaurantes: restaurante, bar, café, pizza, delivery, comida, almuerzo, cena, rappi, pedidosya
- Ropa: ropa, zapatillas, zapatos, remera, pantalón, campera
- Tecnología: celular, notebook, auriculares, cargador, mercadolibre
- Hogar: mueble, decoración, limpieza, electrodoméstico
- Otros: si no encaja en ninguna categoría anterior

IMPORTANTE:
- Respondé SOLO con el JSON, sin texto adicional, sin markdown, sin backticks
- El campo confidence SIEMPRE debe ser un número entre 0 y 1, nunca 0 exacto salvo que sea imposible detectar la intención
- Para fechas relativas como "mañana", "pasado mañana", "el viernes", calculá la fecha real basándote en hoy: {{FECHA_HOY}}.

INTERPRETACIÓN DE FECHAS EN CONSULTAS:
Hoy es {{FECHA_HOY}} ({{DIA_SEMANA}}) y la hora actual es {{HORA_HOY}}.

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

/**
 * Detects the intent of a natural language input using Gemini.
 * Returns a structured object with intent type, confidence score, and data payload.
 */
export async function detectIntent(text: string): Promise<IntentResult | null> {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const dayOfWeek = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(now)
  const currentTime = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false })

  // Use global regex to replace all occurrences of each placeholder
  const systemInstruction = INTENT_SYSTEM_PROMPT
    .replace(/{{FECHA_HOY}}/g, today)
    .replace(/{{DIA_SEMANA}}/g, dayOfWeek)
    .replace(/{{HORA_HOY}}/g, currentTime)

  const { text: raw, error } = await callGemini(text, {
    systemInstruction,
    temperature: 0.1, // Low temperature for consistent structured output
    maxOutputTokens: 512,
  })

  if (!raw || error) {
    logger.error('[detectIntent] Gemini call failed:', error)
    return null
  }

  // Strip any accidental markdown fences
  const cleaned = raw.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()

  let parsed
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    logger.error('[detectIntent] Router parse error')
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
