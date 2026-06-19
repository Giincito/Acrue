"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import {
  addDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns"
import {
  Activity,
  CalendarDays,
  Check,
  Clock3,
  Flame,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { toast } from "sonner"

import { formatHabitSchedule } from "@/lib/habits/analytics"
import { trpc } from "@/lib/trpc"
import { cn } from "@/lib/utils"
import { ModuleHeader } from "@/components/layout/module-header"
import { ModuleShell } from "@/components/layout/module-shell"
import { TabTransition } from "@/components/layout/module-transition"
import { AiThinking } from "@/components/ui/ai-thinking"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"

type HabitFrequency = "daily" | "weekly" | "custom"
type HabitView = "today" | "week" | "month" | "year" | "xp"
type CustomRuleType =
  | "every_n_days"
  | "every_n_weeks"
  | "month_start"
  | "month_end"
  | "business_days"
  | "non_business_days"
  | "argentina_holidays"

type HabitCustomRule =
  | {
      type: "every_n_days"
      intervalDays: number
      anchorDate?: string | null
    }
  | {
      type: "every_n_weeks"
      intervalWeeks: number
      daysOfWeek: number[]
      anchorDate?: string | null
    }
  | { type: "month_start" }
  | { type: "month_end" }
  | { type: "business_days" }
  | { type: "non_business_days" }
  | { type: "argentina_holidays" }

type HabitItem = {
  id: string
  name: string
  frequency: HabitFrequency
  days_of_week: number[]
  custom_rule: HabitCustomRule | null
  time_of_day: string | null
  active: boolean
  completedToday: boolean
  lastCompletedAt: string | null
}

type HeatmapDay = {
  date: string
  completedCount: number
  totalHabitCount: number
  dueHabitCount: number
  level: 0 | 1 | 2 | 3
}

type StreakItem = {
  habitId: string
  current: number
  best: number
}

type XPSummary = {
  totalXP: number
  level: number
  title: string
  currentLevelMin: number
  nextLevelMin: number
  xpIntoLevel: number
  xpForNextLevel: number
  progress: number
  weeklyXP: number
  recentEvents: Array<{
    id: string
    xp_delta: number
    description: string | null
    created_at: string
  }>
}

type HabitInsights = {
  globalHint: string | null
  byHabit: Array<{
    habitId: string
    bestTimeHint: string | null
    consistencyHint: string
  }>
}

const WEEKDAYS = [
  { value: 1, short: "L", label: "Lunes" },
  { value: 2, short: "M", label: "Martes" },
  { value: 3, short: "X", label: "Miércoles" },
  { value: 4, short: "J", label: "Jueves" },
  { value: 5, short: "V", label: "Viernes" },
  { value: 6, short: "S", label: "Sábado" },
  { value: 7, short: "D", label: "Domingo" },
] as const

const FREQUENCY_OPTIONS: Array<{
  value: HabitFrequency
  label: string
  description: string
}> = [
  { value: "daily", label: "Diario", description: "Todos los días" },
  { value: "weekly", label: "Semanal", description: "Días fijos por semana" },
  { value: "custom", label: "Personalizado", description: "Reglas avanzadas" },
]

const CUSTOM_RULE_OPTIONS: Array<{
  value: CustomRuleType
  label: string
  description: string
}> = [
  { value: "every_n_days", label: "Cada N días", description: "Intervalo fijo desde una fecha base" },
  { value: "every_n_weeks", label: "Cada N semanas", description: "Días concretos cada cierta cantidad de semanas" },
  { value: "month_start", label: "Inicio de mes", description: "Primer día de cada mes" },
  { value: "month_end", label: "Fin de mes", description: "Último día de cada mes" },
  { value: "business_days", label: "Días hábiles", description: "Lunes a viernes sin feriados fijos" },
  { value: "non_business_days", label: "Días no hábiles", description: "Fines de semana o feriados fijos" },
  { value: "argentina_holidays", label: "Feriados argentinos", description: "Feriados nacionales fijos" },
]

const HABIT_VIEW_COPY: Record<HabitView, { title: string; description: string }> = {
  today: {
    title: "Hoy",
    description: "Rutinas activas para registrar durante el día.",
  },
  week: {
    title: "Semana",
    description: "Constancia semanal y días con hábitos completados.",
  },
  month: {
    title: "Mes",
    description: "Mapa mensual de cumplimiento y continuidad.",
  },
  year: {
    title: "Año",
    description: "Vista larga de progreso acumulado.",
  },
  xp: {
    title: "XP",
    description: "Nivel, experiencia semanal e historial reciente.",
  },
}

function toLocalDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-")
}

function getRange(view: HabitView) {
  const now = new Date()

  if (view === "month") {
    return {
      startDate: toLocalDateKey(startOfMonth(now)),
      endDate: toLocalDateKey(endOfMonth(now)),
    }
  }

  if (view === "year") {
    return {
      startDate: toLocalDateKey(startOfYear(now)),
      endDate: toLocalDateKey(endOfYear(now)),
    }
  }

  return {
    startDate: toLocalDateKey(startOfWeek(now, { weekStartsOn: 1 })),
    endDate: toLocalDateKey(endOfWeek(now, { weekStartsOn: 1 })),
  }
}

function formatDate(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  })
}

function levelClass(level: HeatmapDay["level"]) {
  if (level === 1) return "border-warning/30 bg-warning/20 text-foreground"
  if (level === 2) return "border-warning/60 bg-warning/50 text-warning-foreground"
  if (level === 3) return "border-destructive/60 bg-destructive/75 text-destructive-foreground"
  return "border-border bg-background text-muted-foreground"
}

function getHabitView(view: string | null): HabitView {
  if (view === "week" || view === "month" || view === "year" || view === "xp") {
    return view
  }

  return "today"
}

export function HabitListView() {
  const searchParams = useSearchParams()
  const activeView = getHabitView(searchParams.get("view"))
  const [showForm, setShowForm] = React.useState(false)

  const todayBounds = React.useMemo(() => {
    const now = new Date()
    return {
      dayStart: startOfDay(now).toISOString(),
      dayEnd: addDays(startOfDay(now), 1).toISOString(),
    }
  }, [])

  const heatmapRange = React.useMemo(() => getRange(activeView), [activeView])
  const utils = trpc.useUtils()
  const { data: habits, isLoading } = trpc.habits.list.useQuery(todayBounds)
  const { data: heatmap, isLoading: heatmapLoading } = trpc.habits.heatmap.useQuery(heatmapRange)
  const {
    data: insights,
    isLoading: insightsLoading,
    isFetching: insightsFetching,
  } = trpc.habits.insights.useQuery()
  const { data: xpSummary, isLoading: xpLoading } = trpc.xp.summary.useQuery()
  const habitItems = (habits ?? []) as HabitItem[]
  const heatmapDays = (heatmap?.days ?? []) as HeatmapDay[]
  const streaks = (heatmap?.streaks ?? []) as StreakItem[]
  const habitInsights = insights as HabitInsights | undefined
  const copy = HABIT_VIEW_COPY[activeView]

  const refreshHabits = React.useCallback(() => {
    utils.habits.list.invalidate()
    utils.habits.heatmap.invalidate()
    utils.xp.summary.invalidate()
  }, [utils])

  const completeHabit = trpc.habits.complete.useMutation({
    onSuccess: (completion) => {
      refreshHabits()
      if (completion.alreadyCompleted) {
        toast.info("Ya estaba registrado para hoy.")
        return
      }
      toast.success("Hábito completado. +15 XP")
    },
    onError: (err) => {
      toast.error("No se pudo completar el hábito", { description: err.message })
    },
  })

  const uncompleteHabit = trpc.habits.uncomplete.useMutation({
    onSuccess: (completion) => {
      refreshHabits()
      if (completion.alreadyUncompleted) {
        toast.info("El hábito ya estaba sin marcar.")
        return
      }
      toast.success("Hábito desmarcado. -15 XP")
    },
    onError: (err) => {
      toast.error("No se pudo desmarcar el hábito", { description: err.message })
    },
  })

  const deleteHabit = trpc.habits.delete.useMutation({
    onSuccess: () => {
      refreshHabits()
      toast.success("Hábito archivado")
    },
    onError: (err) => {
      toast.error("No se pudo archivar el hábito", { description: err.message })
    },
  })

  const handleToggle = (habit: HabitItem) => {
    const now = new Date()
    const payload = {
      id: habit.id,
      completed_at: now.toISOString(),
      dayStart: startOfDay(now).toISOString(),
      dayEnd: addDays(startOfDay(now), 1).toISOString(),
    }

    if (habit.completedToday) {
      uncompleteHabit.mutate(payload)
      return
    }

    completeHabit.mutate(payload)
  }

  return (
    <ModuleShell>
        <ModuleHeader
          module="Hábitos"
          title={copy.title}
          description={copy.description}
          actions={
          <Button
            type="button"
            className="cursor-pointer gap-2"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Nuevo hábito</span>
          </Button>
          }
        />

        <TabTransition value={activeView} className="min-w-0">
          {activeView === "today" && (
            <TodayPanel
              habits={habitItems}
              streaks={streaks}
              insights={habitInsights}
              isInsightsPending={insightsLoading || insightsFetching}
              isLoading={isLoading}
              isMutating={completeHabit.isPending || uncompleteHabit.isPending}
              onToggle={handleToggle}
              onDelete={(habitId) => deleteHabit.mutate({ id: habitId })}
              onCreate={() => setShowForm(true)}
            />
          )}

          {(activeView === "week" || activeView === "month" || activeView === "year") && (
            <TimelinePanel
              view={activeView}
              days={heatmapDays}
              isLoading={heatmapLoading}
              range={heatmapRange}
            />
          )}

          {activeView === "xp" && (
            <XPPanel summary={xpSummary as XPSummary | undefined} isLoading={xpLoading} />
          )}
        </TabTransition>

        <HabitForm
          open={showForm}
          onOpenChange={setShowForm}
          onSuccess={() => {
            refreshHabits()
            setShowForm(false)
          }}
        />
    </ModuleShell>
  )
}

function TodayPanel({
  habits,
  streaks,
  insights,
  isInsightsPending,
  isLoading,
  isMutating,
  onToggle,
  onDelete,
  onCreate,
}: {
  habits: HabitItem[]
  streaks: StreakItem[]
  insights?: HabitInsights
  isInsightsPending: boolean
  isLoading: boolean
  isMutating: boolean
  onToggle: (habit: HabitItem) => void
  onDelete: (habitId: string) => void
  onCreate: () => void
}) {
  const streakByHabit = new Map(streaks.map((streak) => [streak.habitId, streak]))
  const insightByHabit = new Map((insights?.byHabit ?? []).map((insight) => [insight.habitId, insight]))

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-[68px] animate-pulse rounded-lg border border-border/50 bg-card" />
        ))}
      </div>
    )
  }

  if (!habits.length) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/70 px-6 text-center">
        <Activity className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <h2 className="mt-4 text-base font-medium text-foreground">Sin hábitos activos.</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          Creá una rutina simple y registrala desde esta lista.
        </p>
        <Button type="button" variant="outline" className="mt-4 cursor-pointer gap-2" onClick={onCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nuevo hábito
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {isInsightsPending ? (
        <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
          <AiThinking text="Pensando..." />
        </div>
      ) : insights?.globalHint ? (
        <div className="rounded-xl border border-border/60 bg-card px-4 py-3 text-sm text-muted-foreground">
          {insights.globalHint}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
        <AnimatePresence initial={false}>
          {habits.map((habit, index) => {
            const streak = streakByHabit.get(habit.id)
            const insight = insightByHabit.get(habit.id)

            return (
              <motion.article
              key={habit.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, delay: Math.min(index, 5) * 0.03 }}
              className="group flex min-h-[68px] items-center gap-3 border-b border-border/50 px-4 py-3 last:border-b-0"
            >
                <button
                type="button"
                aria-label={habit.completedToday ? `Desmarcar ${habit.name}` : `Completar ${habit.name}`}
                disabled={isMutating}
                onClick={() => onToggle(habit)}
                className={cn(
                  "flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition-colors",
                  habit.completedToday
                    ? "border-success/30 bg-success/10 text-success hover:border-warning hover:text-warning"
                    : "border-border bg-background text-muted-foreground hover:border-accent hover:text-accent",
                  "disabled:cursor-not-allowed disabled:opacity-70"
                )}
              >
                {isMutating ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : habit.completedToday ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Activity className="h-4 w-4" aria-hidden="true" />
                )}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-sm font-medium text-foreground">{habit.name}</h2>
                    {habit.completedToday && (
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.06em] text-success">
                        Hoy
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatHabitSchedule(habit)}
                    </span>
                    {streak && streak.current > 0 && (
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                        {streak.current} días
                      </span>
                    )}
                    {habit.lastCompletedAt && (
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                        {new Date(habit.lastCompletedAt).toLocaleTimeString("es-AR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                  {insight?.bestTimeHint && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">{insight.bestTimeHint}</p>
                  )}
                </div>

              {habit.completedToday && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Desmarcar ${habit.name}`}
                  className="shrink-0 cursor-pointer text-muted-foreground hover:text-warning"
                  disabled={isMutating}
                  onClick={() => onToggle(habit)}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Archivar ${habit.name}`}
                className="shrink-0 cursor-pointer text-muted-foreground opacity-100 hover:text-destructive md:opacity-0 md:group-hover:opacity-100"
                onClick={() => onDelete(habit.id)}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
              </motion.article>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}

function TimelinePanel({
  view,
  days,
  isLoading,
  range,
}: {
  view: HabitView
  days: HeatmapDay[]
  isLoading: boolean
  range: { startDate: string; endDate: string }
}) {
  const title = view === "week" ? "Vista semanal" : view === "month" ? "Vista mensual" : "Vista anual"
  const todayKey = toLocalDateKey(new Date())

  if (isLoading) {
    return <div className="h-[280px] animate-pulse rounded-xl border border-border/60 bg-card" />
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-medium text-foreground">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDate(range.startDate)} - {formatDate(range.endDate)}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>0</span>
            <span className="h-3 w-3 rounded-[3px] border border-border bg-background" />
            <span className="h-3 w-3 rounded-[3px] border border-warning/30 bg-warning/20" />
            <span className="h-3 w-3 rounded-[3px] border border-warning/60 bg-warning/50" />
            <span className="h-3 w-3 rounded-[3px] border border-destructive/60 bg-destructive/75" />
            <span>3+</span>
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <div
            className={cn(
              "grid gap-1",
              view === "year" ? "grid-flow-col grid-rows-7 auto-cols-[12px]" : "grid-cols-7"
            )}
          >
            {days.map((day) => (
              <div
                key={day.date}
                title={`${formatDate(day.date)}: ${day.completedCount}/${day.totalHabitCount}`}
                className={cn(
                  "flex aspect-square min-h-3 min-w-3 items-center justify-center rounded-[3px] border text-[10px] font-medium tabular-nums",
                  view === "year" ? "h-3 w-3" : "min-h-11",
                  levelClass(day.level),
                  day.date === todayKey && "ring-inset ring-1 ring-accent"
                )}
              >
                {view === "year" ? null : day.completedCount}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {days.slice(-8).map((day) => (
          <div
            key={day.date}
            className="flex min-h-[52px] items-center justify-between rounded-lg border border-border/60 bg-card px-3 py-2"
          >
            <span className="text-sm font-medium text-foreground">{formatDate(day.date)}</span>
            <span className="text-sm text-muted-foreground tabular-nums">
              {day.completedCount}/{day.totalHabitCount} hábitos
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function XPPanel({
  summary,
  isLoading,
}: {
  summary?: XPSummary
  isLoading: boolean
}) {
  if (isLoading || !summary) {
    return <div className="h-[220px] animate-pulse rounded-xl border border-border/60 bg-card" />
  }

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <p className="text-sm text-muted-foreground">Nivel {summary.level}</p>
        <h2 className="mt-1 text-2xl font-medium text-foreground">{summary.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground tabular-nums">
          {summary.totalXP.toLocaleString("es-AR")} XP acumulados
        </p>
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{summary.currentLevelMin} XP</span>
            <span>{summary.nextLevelMin} XP</span>
          </div>
          <Progress value={summary.progress} aria-label="Progreso de XP" />
        </div>
        <div className="mt-5 rounded-lg border border-border/60 bg-background px-3 py-2">
          <p className="text-xs text-muted-foreground">Ganado esta semana</p>
          <p className="mt-1 text-lg font-medium text-foreground tabular-nums">
            {summary.weeklyXP >= 0 ? "+" : ""}
            {summary.weeklyXP} XP
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card">
        <div className="border-b border-border/60 px-4 py-3">
          <h2 className="text-base font-medium text-foreground">Historial reciente</h2>
        </div>
        <div className="divide-y divide-border/60">
          {summary.recentEvents.length ? (
            summary.recentEvents.map((event) => (
              <div key={event.id} className="flex min-h-[52px] items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {event.description ?? "Evento de XP"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(event.created_at).toLocaleDateString("es-AR")}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                  {event.xp_delta >= 0 ? "+" : ""}
                  {event.xp_delta}
                </span>
              </div>
            ))
          ) : (
            <div className="px-4 py-8 text-sm text-muted-foreground">Todavía no hay eventos esta semana.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string
  value: T
  options: Array<{
    value: T
    label: string
    description: string
  }>
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-foreground">{label}</legend>
      <div className={cn("grid gap-2", className)}>
        {options.map((option) => {
          const selected = value === option.value

          return (
            <button
              key={option.value}
              type="button"
              aria-label={option.label}
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                "flex min-h-14 w-full cursor-pointer flex-col justify-center rounded-lg border px-3 py-2 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/20",
                selected
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border bg-background/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span className="text-sm font-medium">{option.label}</span>
              <span className="mt-0.5 text-xs leading-4 text-muted-foreground">{option.description}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

function HabitForm({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [name, setName] = React.useState("")
  const [frequency, setFrequency] = React.useState<HabitFrequency>("daily")
  const [selectedDays, setSelectedDays] = React.useState<number[]>([])
  const [timeOfDay, setTimeOfDay] = React.useState("")
  const [customRuleType, setCustomRuleType] = React.useState<CustomRuleType>("every_n_weeks")
  const [intervalDays, setIntervalDays] = React.useState(2)
  const [intervalWeeks, setIntervalWeeks] = React.useState(2)
  const [anchorDate, setAnchorDate] = React.useState(toLocalDateKey(new Date()))

  const createHabit = trpc.habits.create.useMutation({
    onSuccess: () => {
      toast.success("Hábito creado")
      setName("")
      setFrequency("daily")
      setSelectedDays([])
      setTimeOfDay("")
      setCustomRuleType("every_n_weeks")
      setIntervalDays(2)
      setIntervalWeeks(2)
      setAnchorDate(toLocalDateKey(new Date()))
      onSuccess()
    },
    onError: (err) => {
      toast.error("No se pudo crear el hábito", { description: err.message })
    },
  })

  const needsDays = frequency === "weekly" || (frequency === "custom" && customRuleType === "every_n_weeks")
  const canSubmit = name.trim().length > 0 && (!needsDays || selectedDays.length > 0)

  const toggleDay = (day: number) => {
    setSelectedDays((current) =>
      current.includes(day)
        ? current.filter((selectedDay) => selectedDay !== day)
        : [...current, day].sort((a, b) => a - b)
    )
  }

  const buildCustomRule = (): HabitCustomRule | null => {
    if (frequency !== "custom") return null
    if (customRuleType === "every_n_days") {
      return {
        type: "every_n_days",
        intervalDays,
        anchorDate,
      }
    }

    if (customRuleType === "every_n_weeks") {
      return {
        type: "every_n_weeks",
        intervalWeeks,
        daysOfWeek: selectedDays,
        anchorDate,
      }
    }

    return { type: customRuleType }
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return

    createHabit.mutate({
      name: name.trim(),
      frequency,
      days_of_week: needsDays ? selectedDays : [],
      custom_rule: buildCustomRule(),
      time_of_day: timeOfDay || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo hábito</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="habit-name" className="text-sm font-medium text-foreground">
              Nombre
            </label>
            <input
              id="habit-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej: Leer 20 minutos"
              className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
              autoFocus
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
            <ChoiceGroup
              label="Frecuencia"
              value={frequency}
              options={FREQUENCY_OPTIONS}
              onChange={(nextFrequency) => {
                setFrequency(nextFrequency)
                setSelectedDays([])
              }}
            />

            <div className="space-y-1.5">
              <label htmlFor="habit-time" className="text-sm font-medium text-foreground">
                Hora opcional
              </label>
              <input
                id="habit-time"
                type="time"
                value={timeOfDay}
                onChange={(event) => setTimeOfDay(event.target.value)}
                className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
              />
            </div>
          </div>

          {frequency === "custom" && (
            <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
              <ChoiceGroup
                label="Regla personalizada"
                value={customRuleType}
                options={CUSTOM_RULE_OPTIONS}
                onChange={(nextRule) => {
                  setCustomRuleType(nextRule)
                  setSelectedDays([])
                }}
                className="sm:grid-cols-2"
              />

              {customRuleType === "every_n_days" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="habit-interval-days" className="text-sm font-medium text-foreground">
                      Cada
                    </label>
                    <div className="flex overflow-hidden rounded-lg border border-input bg-background focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
                      <input
                        id="habit-interval-days"
                        type="number"
                        min={1}
                        max={365}
                        value={intervalDays}
                        onChange={(event) => setIntervalDays(Number(event.target.value))}
                        className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                      />
                      <span className="flex h-11 items-center border-l border-border px-3 text-sm text-muted-foreground">
                        días
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="habit-anchor-days" className="text-sm font-medium text-foreground">
                      Fecha base
                    </label>
                    <input
                      id="habit-anchor-days"
                      type="date"
                      value={anchorDate}
                      onChange={(event) => setAnchorDate(event.target.value)}
                      className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
                    />
                  </div>
                </div>
              )}

              {customRuleType === "every_n_weeks" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="habit-interval" className="text-sm font-medium text-foreground">
                      Cada
                    </label>
                    <input
                      id="habit-interval"
                      type="number"
                      min={1}
                      max={12}
                      value={intervalWeeks}
                      onChange={(event) => setIntervalWeeks(Number(event.target.value))}
                      className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="habit-anchor" className="text-sm font-medium text-foreground">
                      Semana base
                    </label>
                    <input
                      id="habit-anchor"
                      type="date"
                      value={anchorDate}
                      onChange={(event) => setAnchorDate(event.target.value)}
                      className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {needsDays && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-foreground">Días</legend>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((weekday) => {
                  const selected = selectedDays.includes(weekday.value)
                  return (
                    <button
                      key={weekday.value}
                      type="button"
                      aria-pressed={selected}
                      aria-label={weekday.label}
                      onClick={() => toggleDay(weekday.value)}
                      className={cn(
                        "flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border text-sm font-medium transition-colors",
                        selected
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {weekday.short}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          )}

          <DialogFooter>
            <Button
              type="submit"
              disabled={!canSubmit || createHabit.isPending}
              className="cursor-pointer gap-2"
            >
              {createHabit.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Crear hábito
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
