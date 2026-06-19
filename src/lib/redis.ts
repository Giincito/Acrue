import { Redis } from '@upstash/redis'
import { logger } from '@/lib/server/logger'

const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

if (!redisUrl || !redisToken) {
  logger.warn('UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN missing. Redis features will be disabled.')
}

/**
 * Singleton Upstash Redis client.
 * Returns null when env vars are missing (dev without Redis).
 */
export const redis = (redisUrl && redisToken)
  ? new Redis({ url: redisUrl, token: redisToken })
  : null
