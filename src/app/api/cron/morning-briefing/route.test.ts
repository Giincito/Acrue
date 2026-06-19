import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildDailyBriefing, formatDailyBriefingTelegram } from '@/lib/gemini/briefing'
import { sendTelegramMessage } from '@/lib/telegram'
import { createServiceClient } from '@/utils/supabase/service'
import { GET } from './route'

vi.mock('@/lib/gemini/briefing', () => ({
  buildDailyBriefing: vi.fn(),
  formatDailyBriefingTelegram: vi.fn(),
}))

vi.mock('@/lib/telegram', () => ({
  sendTelegramMessage: vi.fn(),
}))

vi.mock('@/utils/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

vi.mock('@/lib/server/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

function createUsersSupabaseMock(users: Array<{ id: string; telegram_chat_id: string }>) {
  return {
    from() {
      return {
        select() {
          return {
            async not() {
              return { data: users, error: null }
            },
          }
        },
      }
    },
  }
}

describe('morning briefing cron', () => {
  const originalCronSecret = process.env.CRON_SECRET

  afterEach(() => {
    vi.clearAllMocks()
    if (originalCronSecret === undefined) {
      delete process.env.CRON_SECRET
    } else {
      process.env.CRON_SECRET = originalCronSecret
    }
  })

  it('fails the cron when every Telegram delivery fails', async () => {
    process.env.CRON_SECRET = 'cron-secret'
    vi.mocked(createServiceClient).mockReturnValue(
      createUsersSupabaseMock([
        { id: 'user-1', telegram_chat_id: '1001' },
        { id: 'user-2', telegram_chat_id: '1002' },
      ]) as never
    )
    vi.mocked(buildDailyBriefing).mockResolvedValue({} as never)
    vi.mocked(formatDailyBriefingTelegram).mockReturnValue('briefing')
    vi.mocked(sendTelegramMessage).mockResolvedValue(false)

    const response = await GET(
      new Request('http://acrue.test/api/cron/morning-briefing', {
        headers: { authorization: 'Bearer cron-secret' },
      })
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      success: false,
      sent: 0,
      failed: 2,
      error: 'No se pudo enviar ningun briefing diario.',
    })
  })
})
