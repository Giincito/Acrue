"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Loader2,
  Plus,
  Trash2,
  Utensils,
} from "lucide-react"
import { toast } from "sonner"
import { trpc } from "@/lib/trpc"
import { ModuleHeader } from "@/components/layout/module-header"
import { Button } from "@/components/ui/button"
import { MealLogForm } from "./MealLogForm"

const DAILY_CALORIE_TARGET = 2000

const MEAL_TYPE_LABELS: Record<string, string> = {
  desayuno: "Desayuno",
  almuerzo: "Almuerzo",
  merienda: "Merienda",
  cena: "Cena",
  snack: "Snack",
}

const MEAL_TYPE_ORDER = ["desayuno", "almuerzo", "merienda", "cena", "snack"]

interface MealRecipeSummary {
  name: string | null
}

interface MealSummaryItem {
  id: string
  calories: number | null
  meal_type: string | null
  description: string | null
  logged_at: string
  recipes: MealRecipeSummary | MealRecipeSummary[] | null
}

interface DaySummary {
  meals: MealSummaryItem[]
  totalCalories: number
  date: string
}

interface WeekSummaryDay {
  date: string
  dayName: string
  calories: number
}

const getWeekStart = (dateStr: string) => {
  const date = new Date(`${dateStr}T12:00:00`)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(date.setDate(diff))
  return monday.toISOString().split("T")[0]
}

const formatDate = (dateStr: string) => {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

const getRecipeName = (recipes: MealSummaryItem["recipes"]) => {
  if (Array.isArray(recipes)) return recipes[0]?.name ?? null
  return recipes?.name ?? null
}

export function MealTracker() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [showForm, setShowForm] = useState(false)
  const [showWeek, setShowWeek] = useState(false)

  const utils = trpc.useUtils()

  const { data: daySummary, isLoading } = trpc.mealLog.getDaySummary.useQuery({
    date: selectedDate,
  })
  const daySummaryData = daySummary as DaySummary | undefined

  const { data: weekSummary } = trpc.mealLog.getWeekSummary.useQuery({
    startDate: getWeekStart(selectedDate),
  })
  const weekSummaryRows = (weekSummary ?? []) as WeekSummaryDay[]

  const deleteMeal = trpc.mealLog.delete.useMutation({
    onSuccess: () => toast.success("Comida eliminada"),
    onSettled: () => {
      utils.mealLog.getDaySummary.invalidate({ date: selectedDate })
      utils.mealLog.getWeekSummary.invalidate()
    },
    onError: (error) => toast.error("Error", { description: error.message }),
  })

  const navigateDay = (delta: number) => {
    const date = new Date(`${selectedDate}T12:00:00`)
    date.setDate(date.getDate() + delta)
    setSelectedDate(date.toISOString().split("T")[0])
  }

  const isToday = selectedDate === new Date().toISOString().split("T")[0]
  const totalCalories = daySummaryData?.totalCalories ?? 0
  const calorieRatio = (totalCalories / DAILY_CALORIE_TARGET) * 100
  const caloriePercentage = Math.min(100, calorieRatio)

  const mealsByType = new Map<string, MealSummaryItem[]>()
  for (const type of MEAL_TYPE_ORDER) {
    mealsByType.set(type, [])
  }
  for (const meal of daySummaryData?.meals ?? []) {
    const type = meal.meal_type || "snack"
    const existing = mealsByType.get(type) ?? []
    existing.push(meal)
    mealsByType.set(type, existing)
  }

  return (
    <div className="space-y-4">
      <ModuleHeader
        module="Recetas"
        title="Tracker"
        description={<span className="capitalize">{isToday ? "Hoy" : formatDate(selectedDate)}</span>}
        className="pt-0"
        actions={
          <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowWeek((current) => !current)}
            className="cursor-pointer text-xs"
          >
            {showWeek ? "Día" : "Semana"}
          </Button>
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="gap-1.5 cursor-pointer"
            id="log-meal-btn"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Registrar</span>
          </Button>
          </>
        }
      />

      <div className="flex items-center justify-center gap-4">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Ver dia anterior"
          onClick={() => navigateDay(-1)}
          className="cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <button
          type="button"
          onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
          aria-label="Volver a hoy en comidas"
          className="text-sm font-medium cursor-pointer hover:text-primary transition-colors capitalize"
        >
          {formatDate(selectedDate)}
        </button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Ver dia siguiente"
          onClick={() => navigateDay(1)}
          className="cursor-pointer"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border bg-card p-4 space-y-2"
      >
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 font-medium">
            <Flame className="h-4 w-4 text-primary" />
            Calorías del día
          </span>
          <span className="tabular-nums font-mono">
            {totalCalories} / {DAILY_CALORIE_TARGET} kcal
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            className={`h-full rounded-full transition-[background-color,width] duration-300 ease-out motion-reduce:transition-none ${
              calorieRatio > 100
                ? "bg-destructive"
                : calorieRatio > 80
                  ? "bg-warning"
                  : "bg-primary"
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${caloriePercentage}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </motion.div>

      {showWeek && weekSummaryRows.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="rounded-xl border bg-card p-4 overflow-hidden"
        >
          <h3 className="text-sm font-medium mb-3">Resumen semanal</h3>
          <div className="grid grid-cols-7 gap-1">
            {weekSummaryRows.map((day) => {
              const pct = Math.min(100, (day.calories / DAILY_CALORIE_TARGET) * 100)
              const isSelected = day.date === selectedDate
              return (
                <button
                  type="button"
                  key={day.date}
                  onClick={() => setSelectedDate(day.date)}
                  aria-label={`Ver comidas de ${day.dayName}`}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors cursor-pointer ${
                    isSelected ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted/50"
                  }`}
                >
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">
                    {day.dayName}
                  </span>
                  <div className="w-full h-12 rounded bg-muted/50 relative overflow-hidden">
                    <div
                      className="absolute bottom-0 w-full rounded bg-primary/30 transition-[height] duration-300 ease-out motion-reduce:transition-none"
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {day.calories}
                  </span>
                </button>
              )
            })}
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (daySummaryData?.meals?.length ?? 0) > 0 ? (
        <div className="space-y-4">
          {MEAL_TYPE_ORDER.map((type) => {
            const meals = mealsByType.get(type) ?? []
            if (meals.length === 0) return null

            return (
              <div key={type} className="space-y-1">
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {MEAL_TYPE_LABELS[type]}
                </h3>
                <AnimatePresence>
                  {meals.map((meal) => (
                    <motion.div
                      key={meal.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="group flex items-center gap-3 rounded-lg border border-border/50 bg-card p-2.5 transition-colors hover:bg-muted/30"
                    >
                      <Utensils className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm truncate block">
                          {getRecipeName(meal.recipes) ?? meal.description ?? "Sin descripción"}
                        </span>
                      </div>
                      {meal.calories !== null && meal.calories !== undefined && (
                        <span className="text-xs text-muted-foreground tabular-nums font-mono">
                          {meal.calories} kcal
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Eliminar ${getRecipeName(meal.recipes) ?? meal.description ?? "comida"}`}
                        onClick={() => deleteMeal.mutate({ id: meal.id })}
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-12 text-center"
        >
          <div className="h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center mb-3">
            <Utensils className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">
            No hay comidas registradas{isToday ? " hoy" : ""}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 cursor-pointer"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Registrar comida
          </Button>
        </motion.div>
      )}

      <MealLogForm
        open={showForm}
        onOpenChange={setShowForm}
        defaultDate={selectedDate}
        onSuccess={() => {
          utils.mealLog.getDaySummary.invalidate({ date: selectedDate })
          utils.mealLog.getWeekSummary.invalidate()
          setShowForm(false)
        }}
      />
    </div>
  )
}
