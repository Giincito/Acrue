import { GoogleGenerativeAI } from '@google/generative-ai'
import { withFallback } from '@/lib/integrations/resilience'
import { logger } from '@/lib/server/logger'

const apiKey = process.env.GEMINI_API_KEY

if (!apiKey) {
  logger.warn('GEMINI_API_KEY is missing. Gemini features will be disabled.')
}

// Next.js HMR-safe singleton pattern
const globalForGemini = globalThis as unknown as { geminiClient: GoogleGenerativeAI | null }

if (!globalForGemini.geminiClient && apiKey) {
  globalForGemini.geminiClient = new GoogleGenerativeAI(apiKey)
}

export const geminiClient = globalForGemini.geminiClient || null

/** Default model — Gemini 3.1 Flash-Lite */
export const GEMINI_MODEL = 'gemini-3.1-flash-lite-preview'

export interface GeminiOptions {
  model?: string
  temperature?: number
  maxOutputTokens?: number
  systemInstruction?: string
}

/**
 * Core wrapper for a single Gemini text generation call.
 * Uses withFallback to gracefully degrade when the API is unavailable.
 *
 * @param prompt - The user prompt text
 * @param options - Model configuration options
 * @returns The text response from Gemini, or null on failure
 */
export async function callGemini(
  prompt: string,
  options: GeminiOptions = {}
): Promise<{ text: string | null; fromCache: boolean; error?: string }> {
  const {
    model = GEMINI_MODEL,
    temperature = 0.2,
    maxOutputTokens = 1024,
    systemInstruction,
  } = options

  const { data, fromCache, error } = await withFallback(
    async () => {
      if (!geminiClient) throw new Error('Gemini client not initialized')

      const generativeModel = geminiClient.getGenerativeModel({
        model,
        systemInstruction,
        generationConfig: { temperature, maxOutputTokens },
      })

      const result = await generativeModel.generateContent(prompt)
      const text = result.response.text()
      if (!text) throw new Error('Empty response from Gemini')
      return text
    },
    null as string | null,
    undefined // no Redis cache for raw Gemini calls (router handles its own caching)
  )

  return { text: data, fromCache, error }
}
