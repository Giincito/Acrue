import { describe, expect, it } from 'vitest'
import { createContentHash, normalizeEmbedding, toPgVector } from './embeddings'

describe('cerebro embedding utilities', () => {
  it('creates stable content hashes', () => {
    expect(createContentHash('Sistemas distribuidos')).toBe(createContentHash('Sistemas distribuidos'))
    expect(createContentHash('Sistemas distribuidos')).not.toBe(createContentHash('Base de datos'))
  })

  it('normalizes embedding dimensions and removes invalid numbers', () => {
    const vector = normalizeEmbedding([1, Number.NaN, Infinity, -2], 6)

    expect(vector).toEqual([1, 0, 0, -2, 0, 0])
  })

  it('serializes vectors in pgvector format', () => {
    expect(toPgVector([0.1, -0.2, 0])).toBe('[0.1,-0.2,0]')
  })
})
