import { redis } from '@/lib/redis'

/**
 * Wraps an async function with a fallback value and optional Redis cache.
 * On failure it returns the last cached value (if cacheKey provided) or the fallback.
 * Cache TTL defaults to 7200 seconds (2 hours).
 *
 * @param fn - The async operation to execute
 * @param fallback - Value returned when fn fails and no cache exists
 * @param cacheKey - Optional Redis key for caching successful results
 * @param ttl - Cache TTL in seconds (default 7200)
 */
export async function withFallback<T>(
  fn: () => Promise<T>,
  fallback: T,
  cacheKey?: string,
  ttl = 7200
): Promise<{ data: T; fromCache: boolean; error?: string }> {
  try {
    const data = await fn()
    if (cacheKey && redis) {
      await redis.set(cacheKey, JSON.stringify(data), { ex: ttl })
    }
    return { data, fromCache: false }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Servicio no disponible'
    console.error(`[withFallback] Error${cacheKey ? ` (key: ${cacheKey})` : ''}:`, errorMessage)

    if (cacheKey && redis) {
      const cached = await redis.get<string>(cacheKey)
      if (cached) {
        return {
          data: JSON.parse(cached) as T,
          fromCache: true,
          error: errorMessage,
        }
      }
    }

    return { data: fallback, fromCache: false, error: errorMessage }
  }
}
