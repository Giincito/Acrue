'use client'

import { useCallback, useRef } from 'react'

/**
 * Returns a debounced version of the provided async function.
 * All calls within the delay window are collapsed — only the last fires.
 * Implements the 400ms debounce required for Gemini client-side calls.
 *
 * @param fn - The async function to debounce
 * @param delay - Debounce delay in ms (default 400)
 */
export function useGeminiDebounce<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  delay = 400
): (...args: TArgs) => Promise<TResult> {
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const debounced = useCallback(
    (...args: TArgs) => {
      return new Promise<TResult>((resolve, reject) => {
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(async () => {
          try {
            resolve(await fn(...args))
          } catch (err) {
            reject(err)
          }
        }, delay)
      })
    },
    [fn, delay]
  )

  return debounced
}
