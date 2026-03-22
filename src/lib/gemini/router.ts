import { callGemini } from '@/lib/gemini/client'
import type { IntentResult, IntentType } from '@/types/ai'

const INTENT_SYSTEM_PROMPT = `Sos un clasificador de intenciones para una app personal llamada Acrue. 
Recibirás un texto en español y deberás clasificarlo en exactamente una de estas intenciones:

- gasto: registro de un gasto o compra (ej: "gasté 500 en comida", "compré ropa por 3000")
- ingreso: registro de un ingreso o cobro (ej: "cobré el sueldo", "me pagaron 10000")
- tarea: crear una tarea o recordatorio (ej: "tengo que llamar al médico", "agregar tarea: estudiar")
- evento: crear un evento en el calendario (ej: "reunión el martes a las 10", "cita dental mañana a las 15")
- habito: registrar o crear un hábito (ej: "medité hoy", "crear hábito de ejercicio diario")
- receta: registrar una receta o ingrediente (ej: "agregar pasta a mis recetas", "añadí leche a la despensa")
- nota: crear una nota o apunte libre (ej: "nota: la contraseña es...", "anotar idea sobre el proyecto")
- proyecto: crear o actualizar un proyecto (ej: "nuevo proyecto: rediseño web", "actualizar proyecto tesis")
- wishlist: agregar ítem a lista de deseos (ej: "quiero comprar auriculares sony", "añadir a wishlist: zapatillas nike")
- desconocido: no encaja en ninguna categoría anterior

REGLAS CRÍTICAS:
1. Devolvé SIEMPRE y ÚNICAMENTE un JSON válido con esta estructura exacta, sin texto adicional, sin markdown, sin \`\`\`:
{
  "intent": "<tipo>",
  "confidence": <número entre 0.0 y 1.0>,
  "payload": { <campos relevantes al intent> }
}

2. Para "gasto": payload debe incluir { descripcion, monto (número), categoria?, fecha?, metodo_pago? }
3. Para "tarea": payload debe incluir { title: string, due_at?: string, priority?: number, context_tag?: string }
4. Para "evento": payload debe incluir { titulo, starts_at (ISO datetime), ends_at?, ubicacion? }
5. Para "habito": payload debe incluir { nombre, frecuencia? }
6. Para "nota": payload debe incluir { contenido, titulo? }
7. Para "proyecto": payload debe incluir { nombre, descripcion?, fecha_limite? }
8. Para "wishlist": payload debe incluir { nombre, precio?, tienda?, url? }
9. confidence debe reflejar tu certeza real entre 0.0 y 1.0. Si estás seguro de la intención, devuelve confidence: 0.95. Solo devuelve confidence menor a 0.9 si hay ambigüedad real.
10. Para montos en ARS, el número debe ser numérico (no incluir "$" ni ".").
11. Las fechas relativas (hoy, mañana, el lunes) deben calcularse asumiendo que hoy es: {{FECHA_HOY}}`

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

  try {
    // Strip any accidental markdown fences
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return {
      intent: (parsed.intent ?? 'desconocido') as IntentType,
      confidence: Number(parsed.confidence ?? 0),
      payload: parsed.payload ?? {},
      rawText: text,
    }
  } catch (parseErr) {
    console.error('[detectIntent] JSON parse error:', parseErr, 'Raw:', raw)
    return null
  }
}
