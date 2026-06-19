import { describe, it, expect } from 'vitest'
import { calculateWeightedAverage } from '../grades'

describe('calculateWeightedAverage', () => {
  it('returns 0 when no assignments have grades', () => {
    const assignments = [
      { grade: null, weight: 30 },
      { grade: null, weight: 70 },
    ]
    expect(calculateWeightedAverage(assignments)).toBe(0)
  })

  it('calculates correctly with all graded assignments', () => {
    const assignments = [
      { grade: 8, weight: 40 },
      { grade: 6, weight: 60 },
    ]
    // (8*40 + 6*60) / (40+60) = (320+360)/100 = 6.8
    expect(calculateWeightedAverage(assignments)).toBeCloseTo(6.8)
  })

  it('ignores assignments without grades', () => {
    const assignments = [
      { grade: 7, weight: 50 },
      { grade: null, weight: 50 },
    ]
    // Only considers the first: (7*50) / 50 = 7
    expect(calculateWeightedAverage(assignments)).toBeCloseTo(7)
  })

  it('handles single assignment', () => {
    const assignments = [{ grade: 9, weight: 100 }]
    expect(calculateWeightedAverage(assignments)).toBeCloseTo(9)
  })

  it('returns 0 for empty array', () => {
    expect(calculateWeightedAverage([])).toBe(0)
  })

  it('handles assignments with weight 0', () => {
    const assignments = [
      { grade: 10, weight: 0 },
      { grade: 5, weight: 100 },
    ]
    // (10*0 + 5*100) / (0+100) = 5
    expect(calculateWeightedAverage(assignments)).toBeCloseTo(5)
  })

  it('handles null weights by treating them as 1', () => {
    const assignments = [
      { grade: 8, weight: null },
      { grade: 6, weight: null },
    ]
    // (8*1 + 6*1) / (1+1) = 7
    expect(calculateWeightedAverage(assignments)).toBeCloseTo(7)
  })
})
