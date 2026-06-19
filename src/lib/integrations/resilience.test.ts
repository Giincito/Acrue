import { beforeEach, describe, expect, it, vi } from 'vitest'

const redisMock = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
}))

const loggerMock = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
}))

vi.mock('@/lib/redis', () => ({
  redis: redisMock,
}))

vi.mock('@/lib/server/logger', () => ({
  logger: loggerMock,
}))

describe('withFallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reports recovered integration failures as warnings instead of console errors', async () => {
    const { withFallback } = await import('./resilience')
    const result = await withFallback(
      async () => {
        throw new Error('fetch failed')
      },
      { degraded: true },
      'motivation:2026-06-18'
    )

    expect(result).toEqual({
      data: { degraded: true },
      fromCache: false,
      error: 'fetch failed',
    })
    expect(loggerMock.warn).toHaveBeenCalledWith(
      '[withFallback] Degraded service (key: motivation:2026-06-18)',
      {
        error: 'fetch failed',
        name: 'Error',
        stack: expect.stringContaining('fetch failed'),
      }
    )
    expect(loggerMock.error).not.toHaveBeenCalled()
  })

  it('returns the fallback when an operation fails and the cached value is corrupt', async () => {
    redisMock.get.mockResolvedValueOnce('{not-json')

    const { withFallback } = await import('./resilience')
    const result = await withFallback(
      async () => {
        throw new Error('External service unavailable')
      },
      { ok: false },
      'integration:corrupt-cache'
    )

    expect(result).toEqual({
      data: { ok: false },
      fromCache: false,
      error: 'External service unavailable',
    })
    expect(loggerMock.warn).toHaveBeenCalledWith(
      '[withFallback] Ignoring corrupt cache (key: integration:corrupt-cache)',
      { error: expect.any(String) }
    )
  })
})
