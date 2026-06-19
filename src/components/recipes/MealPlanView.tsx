"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Calendar, RefreshCcw, Sparkles, Utensils } from "lucide-react"
import { toast } from "sonner"
import { ModuleHeader } from "@/components/layout/module-header"
import { AiThinking } from "@/components/ui/ai-thinking"
import { Button } from "@/components/ui/button"

interface MealPlanDay {
  date: string
  dayName: string
  meals: {
    type: string
    name: string
    calories: number
  }[]
}

interface MealPlanResponse {
  plan?: MealPlanDay[]
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  desayuno: "Desayuno",
  almuerzo: "Almuerzo",
  cena: "Cena",
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

export function MealPlanView() {
  const [plan, setPlan] = useState<MealPlanDay[] | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generatePlan = async () => {
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch("/api/recetas/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!res.ok) {
        throw new Error("Error al generar el plan")
      }

      const data = await res.json() as MealPlanResponse
      setPlan(data.plan ?? null)
      toast.success("Plan semanal generado")
    } catch (error) {
      setError(getErrorMessage(error, "No se pudo generar el plan. Intentá de nuevo más tarde."))
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-4">
      <ModuleHeader
        module="Recetas"
        title="Plan semanal"
        description="Planificador de comidas con IA."
        className="pt-0"
        actions={
        <Button
          size="sm"
          onClick={generatePlan}
          disabled={isGenerating}
          className="gap-1.5 cursor-pointer"
          id="generate-meal-plan-btn"
        >
          {isGenerating ? (
            <AiThinking text="" className="text-current" />
          ) : plan ? (
            <RefreshCcw className="h-4 w-4" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {plan ? "Regenerar" : "Generar plan"}
        </Button>
        }
      />

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {plan ? (
        <div className="space-y-2">
          {plan.map((day, index) => (
            <motion.div
              key={day.date}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-xl border bg-card overflow-hidden"
            >
              <div className="px-4 py-2 bg-muted/30 border-b">
                <span className="text-sm font-medium capitalize">{day.dayName}</span>
                <span className="text-xs text-muted-foreground ml-2">{day.date}</span>
              </div>
              <div className="divide-y">
                {day.meals.map((meal, mealIndex) => (
                  <div key={`${meal.type}-${mealIndex}`} className="flex items-center gap-3 px-4 py-2.5">
                    <Utensils className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-muted-foreground">{MEAL_TYPE_LABELS[meal.type] ?? meal.type}</span>
                      <span className="text-sm truncate block">{meal.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums font-mono shrink-0">
                      {meal.calories} kcal
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      ) : !isGenerating ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            Genera un plan semanal basado en tu inventario y preferencias
          </p>
          <Button
            variant="outline"
            className="mt-4 cursor-pointer"
            onClick={generatePlan}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generar plan
          </Button>
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AiThinking text="Pensando..." className="justify-center" />
        </div>
      )}
    </div>
  )
}
