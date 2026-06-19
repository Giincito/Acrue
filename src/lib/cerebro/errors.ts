export const CEREBRO_EMBEDDING_CONFIGURATION_MESSAGE =
  'Gemini no está configurado para embeddings. Configurá GEMINI_API_KEY con una API key válida de Google AI Studio, no con un token OAuth.'

const GENERIC_EMBEDDING_MESSAGE = 'No se pudo generar el embedding.'

function errorToMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return ''
}

export function isUnsupportedGoogleCredential(credential: string | null | undefined) {
  const value = credential?.trim().toLowerCase()
  if (!value) return false

  return (
    value.startsWith('ya29.') ||
    value.startsWith('bearer ya29.') ||
    value.includes('access_token=ya29.')
  )
}

function isGeminiAuthenticationError(message: string) {
  const value = message.toLowerCase()

  return (
    value.includes('access_token_type_unsupported') ||
    value.includes('401 unauthorized') ||
    value.includes('invalid authentication credentials') ||
    value.includes('api_key_invalid') ||
    value.includes('api key not valid') ||
    value.includes('gemini client not initialized') ||
    value.includes('gemini no disponible') ||
    value.includes(CEREBRO_EMBEDDING_CONFIGURATION_MESSAGE.toLowerCase())
  )
}

export function getEmbeddingFailureMessage(error: unknown) {
  const message = errorToMessage(error)
  if (!message) return GENERIC_EMBEDDING_MESSAGE

  if (isGeminiAuthenticationError(message)) {
    return CEREBRO_EMBEDDING_CONFIGURATION_MESSAGE
  }

  return GENERIC_EMBEDDING_MESSAGE
}

export function getCerebroErrorMessage(error: unknown, fallbackMessage: string) {
  const message = errorToMessage(error)
  if (message && isGeminiAuthenticationError(message)) {
    return CEREBRO_EMBEDDING_CONFIGURATION_MESSAGE
  }

  return fallbackMessage
}
