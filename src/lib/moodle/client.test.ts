import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

vi.mock('@/lib/integrations/resilience', () => ({
  withFallback: vi.fn(async (fn: () => Promise<unknown>, fallback: unknown) => ({
    data: await fn(),
    fromCache: false,
    error: fallback === null ? undefined : 'unused',
  })),
}))

describe('Moodle client resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('routes Moodle degradation through the shared withFallback helper', async () => {
    const { withFallback } = await import('@/lib/integrations/resilience')
    const { withMoodleFallback } = await import('./client')

    const result = await withMoodleFallback(async () => ['course'], 'courses')

    expect(result).toEqual(['course'])
    expect(withFallback).toHaveBeenCalledWith(expect.any(Function), null)
  })

  it('returns null when the shared fallback cannot recover Moodle data', async () => {
    const { withFallback } = await import('@/lib/integrations/resilience')
    ;(withFallback as Mock).mockResolvedValueOnce({
      data: null,
      fromCache: false,
      error: 'Moodle no disponible',
    })
    const { withMoodleFallback } = await import('./client')

    const result = await withMoodleFallback(async () => ['course'], 'courses')

    expect(result).toBeNull()
  })
})
