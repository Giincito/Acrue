import { describe, expect, it } from 'vitest'
import {
  CEREBRO_EMBEDDING_CONFIGURATION_MESSAGE,
  getCerebroErrorMessage,
  getEmbeddingFailureMessage,
  isUnsupportedGoogleCredential,
} from './errors'

describe('cerebro error messages', () => {
  it('detects OAuth access tokens used as Gemini API keys', () => {
    expect(isUnsupportedGoogleCredential('ya29.a0AfH6SMB-token')).toBe(true)
    expect(isUnsupportedGoogleCredential('Bearer ya29.a0AfH6SMB-token')).toBe(true)
    expect(isUnsupportedGoogleCredential('AIzaSyValidApiKeyShape')).toBe(false)
  })

  it('sanitizes raw Gemini authentication failures before they reach the client', () => {
    const rawError = '[GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent: [401 Unauthorized] Request had invalid authentication credentials. [{"reason":"ACCESS_TOKEN_TYPE_UNSUPPORTED"}]'

    expect(getEmbeddingFailureMessage(rawError)).toBe(CEREBRO_EMBEDDING_CONFIGURATION_MESSAGE)
    expect(getEmbeddingFailureMessage(rawError)).not.toContain('generativelanguage.googleapis.com')
    expect(getEmbeddingFailureMessage(rawError)).not.toContain('ACCESS_TOKEN_TYPE_UNSUPPORTED')
  })

  it('keeps unrelated embedding failures generic', () => {
    expect(getEmbeddingFailureMessage('Temporary upstream outage')).toBe('No se pudo generar el embedding.')
  })

  it('preserves the safe Gemini configuration message in UI errors', () => {
    expect(getCerebroErrorMessage(new Error(CEREBRO_EMBEDDING_CONFIGURATION_MESSAGE), 'Fallback')).toBe(
      CEREBRO_EMBEDDING_CONFIGURATION_MESSAGE
    )
    expect(getCerebroErrorMessage(new Error('[GoogleGenerativeAI Error]: [401 Unauthorized]'), 'Fallback')).toBe(
      CEREBRO_EMBEDDING_CONFIGURATION_MESSAGE
    )
    expect(getCerebroErrorMessage(new Error('Database timeout'), 'Fallback')).toBe('Fallback')
  })
})
