"use client"

import { useCallback, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { ArrowRightLeft, Clock, Loader2 } from "lucide-react"
import { DegradedNotice } from "@/components/shared/degraded-notice"
import { Input } from "@/components/ui/input"

interface DollarData {
  compra: number
  venta: number
  fecha: string
  timestamp: string
}

/**
 * ARS/USD conversion widget with live blue dollar rate.
 * Fetches from /api/finanzas/dolar with Redis-backed caching.
 * Gracefully degrades when rate is unavailable.
 */
export function DollarWidget() {
  const [rate, setRate] = useState<DollarData | null>(null)
  const [fromCache, setFromCache] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [arsInput, setArsInput] = useState("")
  const [direction, setDirection] = useState<"ars-to-usd" | "usd-to-ars">("ars-to-usd")

  const fetchRate = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/finanzas/dolar")
      const data = await res.json()
      if (data.data) {
        setRate(data.data)
        setFromCache(Boolean(data.fromCache))
      }
      if (data.error) {
        setError(data.error)
      }
    } catch {
      setError("No se pudo obtener el tipo de cambio")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchRate()
  }, [fetchRate])

  const arsValue = parseFloat(arsInput) || 0

  const converted =
    rate && arsValue > 0
      ? direction === "ars-to-usd"
        ? (arsValue / rate.venta).toFixed(2)
        : (arsValue * rate.venta).toFixed(0)
      : null

  const fromLabel = direction === "ars-to-usd" ? "ARS" : "USD"
  const toLabel = direction === "ars-to-usd" ? "USD" : "ARS"

  if (loading) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!rate) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-4">
        <DegradedNotice
          title="Tipo de cambio no disponible"
          detail="Finanzas sigue disponible. Reintentá cuando vuelva la conexión."
          onRetry={() => void fetchRate()}
        />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/50 bg-card p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4" />
          Dólar Blue
        </h2>
        <div className="flex items-center gap-2">
          {fromCache && (
            <span className="text-[10px] text-warning flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Caché
            </span>
          )}
          <div className="flex gap-1 text-xs text-muted-foreground">
            <span className="px-2 py-0.5 rounded bg-muted">
              C: ${rate.compra.toLocaleString("es-AR")}
            </span>
            <span className="px-2 py-0.5 rounded bg-muted">
              V: ${rate.venta.toLocaleString("es-AR")}
            </span>
          </div>
        </div>
      </div>

      {fromCache || error ? (
        <DegradedNotice
          title={fromCache ? "Tipo de cambio en caché" : "Tipo de cambio parcial"}
          detail={fromCache ? "Mostrando el último valor disponible." : error ?? "No se pudo actualizar el valor ahora."}
          onRetry={() => void fetchRate()}
          className="mb-4"
        />
      ) : null}

      {/* Converter */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
            {fromLabel}
          </span>
          <Input
            type="number"
            placeholder="0"
            value={arsInput}
            onChange={(e) => setArsInput(e.target.value)}
            className="pl-12 text-right tabular-nums"
            id="dollar-converter-input"
          />
        </div>

        <button
          onClick={() =>
            setDirection(d => d === "ars-to-usd" ? "usd-to-ars" : "ars-to-usd")
          }
          type="button"
          aria-label="Invertir conversion"
          className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg bg-muted transition-colors hover:bg-muted/80"
          id="dollar-converter-swap"
        >
          <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
            {toLabel}
          </span>
          <div className="h-9 rounded-md border border-input bg-muted/30 px-3 flex items-center justify-end text-sm tabular-nums">
            {converted ?? "—"}
          </div>
        </div>
      </div>

      {error && !rate && (
        <p className="text-xs text-warning mt-2">{error}</p>
      )}
    </motion.div>
  )
}
