import { describe, expect, it, vi } from 'vitest'
import { getLevelProgress, recalibrateXP } from './xp'

describe('XP system', () => {
  it('returns level progress for visible XP surfaces', () => {
    expect(getLevelProgress(450)).toEqual({
      totalXP: 450,
      level: 3,
      title: 'Sistematico',
      currentLevelMin: 300,
      nextLevelMin: 600,
      xpIntoLevel: 150,
      xpForNextLevel: 300,
      progress: 50,
    })
  })

  it('recalibrates XP by appending a delta event', async () => {
    const inserted: Record<string, unknown>[] = []
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: 180, error: null }),
      from: vi.fn(() => ({
        insert: vi.fn((payload: Record<string, unknown>) => {
          inserted.push(payload)
          return Promise.resolve({ error: null })
        }),
      })),
    }

    const result = await recalibrateXP(supabase as never, 'user-1', 250, 'Ajuste manual')

    expect(result).toEqual({
      previousXP: 180,
      targetXP: 250,
      delta: 70,
    })
    expect(inserted).toEqual([
      {
        user_id: 'user-1',
        source_type: 'recalibration',
        source_id: null,
        xp_delta: 70,
        description: 'Ajuste manual',
      },
    ])
  })
})
