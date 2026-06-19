/**
 * ARS/USD dollar rate service using dolarapi.com with Redis caching.
 * Graceful degradation: returns cached rate on API failure, null if no cache.
 * @module lib/finanzas/dolar
 */

import { withFallback } from '@/lib/integrations/resilience'

const DOLAR_API_URL = 'https://dolarapi.com/v1/dolares/blue'
const CACHE_KEY = 'dolar:blue'
const CACHE_TTL = 3600 // 1 hour

interface DolarApiResponse {
  compra: number
  venta: number
  casa: string
  nombre: string
  moneda: string
  fechaActualizacion: string
}

/**
 * Fetches the current blue dollar rate from dolarapi.com.
 * Wrapped in withFallback for Redis-backed graceful degradation.
 *
 * @returns Rate data with fromCache flag, or null data on total failure
 */
export async function getDollarRate() {
  const result = await withFallback<{
    compra: number
    venta: number
    fecha: string
    timestamp: string
  } | null>(
    async () => {
      const res = await fetch(DOLAR_API_URL, {
        next: { revalidate: CACHE_TTL },
        signal: AbortSignal.timeout(5000),
      })

      if (!res.ok) {
        throw new Error(`dolarapi.com responded with ${res.status}`)
      }

      const data: DolarApiResponse = await res.json()

      return {
        compra: data.compra,
        venta: data.venta,
        fecha: data.fechaActualizacion,
        timestamp: new Date().toISOString(),
      }
    },
    null,
    CACHE_KEY,
    CACHE_TTL
  )

  return {
    data: result.data,
    fromCache: result.fromCache,
    error: result.error,
  }
}

/**
 * Converts ARS to USD using the blue dollar sell rate.
 * Returns null if rate is unavailable.
 */
export async function convertArsToUsd(arsAmount: number): Promise<number | null> {
  const { data } = await getDollarRate()
  if (!data || !data.venta) return null
  return Math.round((arsAmount / data.venta) * 100) / 100
}
