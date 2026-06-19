import { createHash } from 'node:crypto'
import { withFallback } from '@/lib/integrations/resilience'
import { geminiClient } from '@/lib/gemini/client'
import {
  CEREBRO_EMBEDDING_CONFIGURATION_MESSAGE,
  getEmbeddingFailureMessage,
  isUnsupportedGoogleCredential,
} from './errors'

export const CEREBRO_EMBEDDING_MODEL = 'text-embedding-004'
export const CEREBRO_EMBEDDING_DIMENSIONS = 768

export function createContentHash(content: string) {
  return createHash('sha256').update(content.trim()).digest('hex')
}

export function normalizeEmbedding(values: number[], dimensions = CEREBRO_EMBEDDING_DIMENSIONS) {
  const normalized = values.slice(0, dimensions).map((value) => (
    Number.isFinite(value) ? value : 0
  ))

  while (normalized.length < dimensions) {
    normalized.push(0)
  }

  return normalized
}

export function toPgVector(values: number[]) {
  return `[${values.map((value) => Number(value.toFixed(8))).join(',')}]`
}

function assertEmbeddingCredentials() {
  const credential = process.env.GEMINI_API_KEY?.trim()

  if (!credential || isUnsupportedGoogleCredential(credential)) {
    throw new Error(CEREBRO_EMBEDDING_CONFIGURATION_MESSAGE)
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const content = text.trim()
  if (!content) {
    throw new Error('Texto requerido para generar embedding.')
  }

  const { data, error } = await withFallback(
    async () => {
      assertEmbeddingCredentials()

      if (!geminiClient) {
        throw new Error(CEREBRO_EMBEDDING_CONFIGURATION_MESSAGE)
      }

      const model = geminiClient.getGenerativeModel({ model: CEREBRO_EMBEDDING_MODEL })
      const result = await model.embedContent(content)
      return normalizeEmbedding(result.embedding.values)
    },
    null as number[] | null
  )

  if (!data) {
    throw new Error(getEmbeddingFailureMessage(error))
  }

  return data
}
