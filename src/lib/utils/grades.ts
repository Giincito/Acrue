/**
 * Grade calculation utilities for the Study module.
 * @module lib/utils/grades
 */

interface GradedItem {
  grade: number | null | undefined
  weight: number | null | undefined
}

/**
 * Calculates the weighted average of graded assignments.
 * Formula: Σ(nota × peso) / Σ(peso) — only considering items with a grade assigned.
 * Items without a grade are ignored.
 * Items with null weight are treated as weight = 1.
 *
 * @param assignments - Array of items with grade and weight properties
 * @returns Weighted average (0-10 scale), or 0 if no graded items exist
 */
export function calculateWeightedAverage(assignments: GradedItem[]): number {
  const graded = assignments.filter(
    (a): a is GradedItem & { grade: number } =>
      a.grade !== null && a.grade !== undefined
  )

  if (graded.length === 0) return 0

  let sumWeightedGrades = 0
  let sumWeights = 0

  for (const a of graded) {
    const w = a.weight ?? 1
    sumWeightedGrades += a.grade * w
    sumWeights += w
  }

  if (sumWeights === 0) return 0

  return sumWeightedGrades / sumWeights
}
