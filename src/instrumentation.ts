import { logger } from '@/lib/server/logger'
/**
 * Initializes server-side background integrations when the Next.js server starts.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { configureTelegramRuntime } = await import('@/lib/telegram')
    const result = await configureTelegramRuntime()

    if (result.configured) {
      logger.info(`[telegram] Runtime configured: ${result.reason}`)
    }
  }
}
