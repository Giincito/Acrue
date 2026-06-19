"use client"

import { useCallback, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Loader2, BrainCircuit } from "lucide-react"
import { DegradedNotice } from "@/components/shared/degraded-notice"

interface PredictionData {
  predictedBalance: number
  dailyAverage: number
  daysRemaining: number
  isNegative: boolean
  currentBalance: number
}

/**
 * Month-end prediction widget using AI-based spending analysis.
 * Fetches from /api/finanzas/prediction.
 * Hides silently when prediction is unavailable (graceful degradation).
 */
export function PredictionWidget() {
  const [prediction, setPrediction] = useState<PredictionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchPrediction = useCallback(async () => {
    setLoading(true)
    setError(false)

    try {
      const res = await fetch("/api/finanzas/prediction")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setPrediction(data)
    } catch {
      setPrediction(null)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchPrediction()
  }, [fetchPrediction])

  if (loading) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-4">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (error || !prediction) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-4">
        <DegradedNotice
          title="Predicción no disponible"
          detail="El panel financiero sigue disponible con los datos cargados."
          onRetry={() => void fetchPrediction()}
        />
      </div>
    )
  }

  const TrendIcon = prediction.isNegative ? TrendingDown : TrendingUp
  const trendColor = prediction.isNegative ? "text-destructive" : "text-success"
  const trendBg = prediction.isNegative ? "bg-destructive/10" : "bg-success/10"

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/50 bg-card p-4"
    >
      <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
        <BrainCircuit className="h-4 w-4" />
        Predicción de fin de mes
      </h2>

      <div className="flex items-center gap-4">
        <div className={`h-12 w-12 rounded-xl ${trendBg} flex items-center justify-center`}>
          <TrendIcon className={`h-6 w-6 ${trendColor}`} />
        </div>
        <div>
          <p className={`text-2xl font-medium tabular-nums ${trendColor}`}>
            {prediction.isNegative ? "-" : "+"}$
            {Math.abs(prediction.predictedBalance).toLocaleString("es-AR")}
          </p>
          <p className="text-xs text-muted-foreground">
            A este ritmo, llegás a fin de mes con{" "}
            <span className={trendColor}>
              {prediction.isNegative ? "-" : "+"}$
              {Math.abs(prediction.predictedBalance).toLocaleString("es-AR")}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Promedio diario</p>
          <p className="text-sm font-medium tabular-nums">
            ${prediction.dailyAverage.toLocaleString("es-AR")}
          </p>
        </div>
        <div className="rounded-lg bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Días restantes</p>
          <p className="text-sm font-medium tabular-nums">
            {prediction.daysRemaining}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
