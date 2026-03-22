import { geminiClient, GEMINI_MODEL } from '@/lib/gemini/client'
import type { ReceiptData } from '@/types/ai'

const VISION_SYSTEM_PROMPT = `Sos un asistente experto en análisis de tickets y comprobantes de compra.
Analizá la imagen y extraé la información del comprobante. 
Devolvé ÚNICAMENTE un JSON válido con esta estructura exacta, sin texto adicional ni markdown:

{
  "comercio": "nombre del comercio o tienda",
  "monto": número total (sin símbolo de moneda, solo el número),
  "items": [
    { "nombre": "descripción del item", "precio": número, "cantidad": número }
  ],
  "fecha": "YYYY-MM-DD",
  "metodo_pago": "efectivo|débito|crédito|transferencia|otro" o null
}

Si no podés leer algún campo, usá null. El monto debe ser el total final del ticket.`

/**
 * Analyzes a receipt image using Gemini Vision.
 * @param imageBase64 - Base64-encoded image string (without data URI prefix)
 * @param mimeType - MIME type of the image (default: image/jpeg)
 */
export async function analyzeReceipt(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg'
): Promise<ReceiptData | null> {
  if (!geminiClient) {
    console.error('[vision] Gemini client not initialized')
    return null
  }

  try {
    const model = geminiClient.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
      systemInstruction: VISION_SYSTEM_PROMPT,
    })

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      },
      'Analizá este ticket y devolvé el JSON con los datos extraídos.',
    ])

    const raw = result.response.text()
    if (!raw) throw new Error('Empty response from Gemini Vision')

    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned) as ReceiptData
  } catch (err) {
    console.error('[vision] analyzeReceipt error:', err)
    return null
  }
}
