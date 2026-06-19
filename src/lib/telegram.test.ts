import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const launch = vi.fn()
const deleteWebhook = vi.fn(() => Promise.resolve())
const setWebhook = vi.fn(() => Promise.resolve())
const sendMessage = vi.fn(() => Promise.resolve())
const start = vi.fn()
const help = vi.fn()
const on = vi.fn()
const stop = vi.fn()

vi.mock('telegraf', () => ({
  Telegraf: vi.fn(function MockTelegraf() {
    return {
      start,
      help,
      on,
      stop,
      launch,
      telegram: {
        deleteWebhook,
        sendMessage,
        setWebhook,
      },
    }
  }),
}))

vi.mock('@/utils/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

vi.mock('@/lib/gemini/chat', () => ({
  sendChatMessage: vi.fn(),
}))

vi.mock('@/lib/gemini/actions', () => ({
  executeAiAction: vi.fn(),
}))

vi.mock('@/lib/gemini/vision', () => ({
  analyzeReceipt: vi.fn(),
}))

describe('Telegram bot module lifecycle', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    deleteWebhook.mockResolvedValue(undefined)
    launch.mockResolvedValue(undefined)
    setWebhook.mockResolvedValue(undefined)
    sendMessage.mockResolvedValue(undefined)
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      TELEGRAM_BOT_TOKEN: 'test-token',
      NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
    }
    delete (globalThis as unknown as { telegramBot?: unknown }).telegramBot
    delete (globalThis as unknown as { telegramRuntimeConfigured?: unknown }).telegramRuntimeConfigured
  })

  afterEach(() => {
    process.env = originalEnv
    delete (globalThis as unknown as { telegramBot?: unknown }).telegramBot
    delete (globalThis as unknown as { telegramRuntimeConfigured?: unknown }).telegramRuntimeConfigured
  })

  it('does not start polling or mutate webhooks just by being imported in development', async () => {
    await import('./telegram')
    await Promise.resolve()

    expect(deleteWebhook).not.toHaveBeenCalled()
    expect(launch).not.toHaveBeenCalled()
    expect(setWebhook).not.toHaveBeenCalled()
  }, 10000)

  it('degrades webhook configuration failures without breaking server startup', async () => {
    process.env.NODE_ENV = 'production'
    setWebhook.mockRejectedValueOnce(new Error('Telegram webhook unavailable'))

    const { configureTelegramRuntime } = await import('./telegram')

    await expect(configureTelegramRuntime()).resolves.toEqual({
      configured: false,
      reason: 'webhook-unavailable',
    })
    expect(setWebhook).toHaveBeenCalledWith('http://localhost:3000/api/telegram')
  })

  it('degrades development polling setup failures without leaving runtime configured', async () => {
    process.env.TELEGRAM_ENABLE_DEV_POLLING = 'true'
    deleteWebhook.mockRejectedValueOnce(new Error('Telegram polling unavailable'))

    const { configureTelegramRuntime } = await import('./telegram')

    await expect(configureTelegramRuntime()).resolves.toEqual({
      configured: false,
      reason: 'development-polling-unavailable',
    })
    expect(launch).not.toHaveBeenCalled()
  })
})
