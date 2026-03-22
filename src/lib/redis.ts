import { Redis } from '@upstash/redis'

const redisUrl = process.env.UPSTASH_REDIS_URL
const redisToken = process.env.UPSTASH_REDIS_TOKEN

if (!redisUrl || !redisToken) {
  console.warn('⚠️ UPSTASH_REDIS_URL or UPSTASH_REDIS_TOKEN missing. Redis features will be disabled.')
}

/**
 * Singleton Upstash Redis client.
 * Returns null when env vars are missing (dev without Redis).
 */
export const redis = (redisUrl && redisToken)
  ? new Redis({ url: redisUrl, token: redisToken })
  : null
