"use client"

import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { CheckCircle2, ListTodo, Music2, Pause, Play, RotateCcw, Square, Timer } from "lucide-react"
import { toast } from "sonner"
import { AiThinking } from "@/components/ui/ai-thinking"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  buildFocusSettings,
  FOCUS_FREE_SESSION_ID,
  formatFocusTime,
  getFocusProgress,
  getFocusTaskSelectLabel,
  normalizeSpotifyPlaylistUrl,
  type FocusMode,
} from "@/lib/focus/pomodoro"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc"

type SessionPhase = "work" | "break"

type FocusPendingTask = {
  id: string
  title: string
  priority: number | null
  due_at: string | null
}

const FOCUS_ACTIVE_TASK_PANEL_CLASS =
  "mt-6 w-full max-w-md rounded-lg border border-[#F6F6F3]/10 bg-[#1E1E1C]/55 p-3 text-left"

function getTodayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setHours(23, 59, 59, 999)
  return { dayStart: start.toISOString(), dayEnd: end.toISOString() }
}

export function PomodoroTimer({
  variant = "dedicated",
}: {
  variant?: "dedicated" | "embedded"
}) {
  const reduceMotion = useReducedMotion()
  const isEmbedded = variant === "embedded"
  const utils = trpc.useUtils()
  const todayRange = React.useMemo(() => getTodayRange(), [])

  const { data: settingsData, isLoading: isLoadingSettings } = trpc.focus.settings.useQuery()
  const { data: pendingTasks = [] } = trpc.focus.pendingTasks.useQuery()
  const tasks = pendingTasks as FocusPendingTask[]
  const { data: summary } = trpc.focus.todaySummary.useQuery(todayRange)
  const completeSession = trpc.focus.completeSession.useMutation({
    onSuccess: async () => {
      await utils.focus.todaySummary.invalidate(todayRange)
      await utils.xp.summary.invalidate()
    },
  })
  const completeTask = trpc.tasks.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.focus.pendingTasks.invalidate(),
        utils.tasks.list.invalidate(),
        utils.xp.summary.invalidate(),
      ])
    },
  })

  const [mode, setMode] = React.useState<FocusMode>("pomodoro")
  const [workMinutes, setWorkMinutes] = React.useState(25)
  const [breakMinutes, setBreakMinutes] = React.useState(5)
  const [selectedTaskId, setSelectedTaskId] = React.useState<string>(FOCUS_FREE_SESSION_ID)
  const [phase, setPhase] = React.useState<SessionPhase>("work")
  const [remainingSeconds, setRemainingSeconds] = React.useState(25 * 60)
  const [isActive, setIsActive] = React.useState(false)
  const [isRunning, setIsRunning] = React.useState(false)
  const [localCompletedSessions, setLocalCompletedSessions] = React.useState(0)
  const [spotifyUnavailable, setSpotifyUnavailable] = React.useState(false)
  const [activeFocusTask, setActiveFocusTask] = React.useState<FocusPendingTask | null>(null)
  const [completedFocusTaskId, setCompletedFocusTaskId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!settingsData) return
    setWorkMinutes(settingsData.workMinutes)
    setBreakMinutes(settingsData.breakMinutes)
  }, [settingsData])

  const focusSettings = React.useMemo(() => (
    buildFocusSettings({ mode, workMinutes, breakMinutes })
  ), [mode, workMinutes, breakMinutes])

  const selectedTask = React.useMemo(() => (
    tasks.find((task) => task.id === selectedTaskId) ?? null
  ), [selectedTaskId, tasks])

  const spotifyEmbed = React.useMemo(() => (
    normalizeSpotifyPlaylistUrl(settingsData?.spotifyPlaylistUrl)
  ), [settingsData?.spotifyPlaylistUrl])
  const focusPanelTasks = React.useMemo(() => (
    activeFocusTask ? [activeFocusTask] : tasks.slice(0, 3)
  ), [activeFocusTask, tasks])

  const totalSeconds = phase === "work" ? focusSettings.workSeconds : focusSettings.breakSeconds
  const progress = getFocusProgress({ totalSeconds, remainingSeconds })
  const completedSessions = (summary?.completedSessions ?? 0) + localCompletedSessions
  const isSelectedFocusTaskCompleted = Boolean(
    activeFocusTask && completedFocusTaskId === activeFocusTask.id
  )

  const registerCompletedWorkSession = React.useCallback(async () => {
    setLocalCompletedSessions((current) => current + 1)

    try {
      if ("vibrate" in navigator) {
        navigator.vibrate([80, 40, 80])
      }

      await completeSession.mutateAsync({
        taskId: activeFocusTask?.id ?? null,
        mode,
        workMinutes: focusSettings.workMinutes,
        breakMinutes: focusSettings.breakMinutes,
        completedAt: new Date().toISOString(),
      })
    } catch {
      setLocalCompletedSessions((current) => Math.max(0, current - 1))
    }
  }, [
    completeSession,
    focusSettings.breakMinutes,
    focusSettings.workMinutes,
    mode,
    activeFocusTask,
  ])

  React.useEffect(() => {
    if (!isActive || !isRunning) return undefined

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current > 1) return current - 1

        if (phase === "work") {
          void registerCompletedWorkSession()
          setPhase("break")
          return focusSettings.breakSeconds
        }

        setPhase("work")
        return focusSettings.workSeconds
      })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [
    focusSettings.breakSeconds,
    focusSettings.workSeconds,
    isActive,
    isRunning,
    phase,
    registerCompletedWorkSession,
  ])

  const startFocus = React.useCallback(() => {
    setPhase("work")
    setRemainingSeconds(focusSettings.workSeconds)
    setActiveFocusTask(selectedTaskId === FOCUS_FREE_SESSION_ID ? null : selectedTask)
    setCompletedFocusTaskId(null)
    setIsActive(true)
    setIsRunning(true)
    setSpotifyUnavailable(false)
  }, [focusSettings.workSeconds, selectedTask, selectedTaskId])

  const stopFocus = React.useCallback(() => {
    setIsRunning(false)
    setIsActive(false)
    setPhase("work")
    setRemainingSeconds(focusSettings.workSeconds)
    setActiveFocusTask(null)
    setCompletedFocusTaskId(null)
  }, [focusSettings.workSeconds])

  const resetSession = React.useCallback(() => {
    setPhase("work")
    setRemainingSeconds(focusSettings.workSeconds)
    setIsRunning(false)
  }, [focusSettings.workSeconds])

  const completeFocusedTask = React.useCallback(async () => {
    if (!activeFocusTask || isSelectedFocusTaskCompleted) return

    const completedAt = new Date().toISOString()

    try {
      await completeTask.mutateAsync({
        id: activeFocusTask.id,
        status: "completed",
        completed_at: completedAt,
      })
      setCompletedFocusTaskId(activeFocusTask.id)
      toast.success("Tarea marcada como terminada")
    } catch {
      toast.error("No se pudo completar la tarea")
    }
  }, [activeFocusTask, completeTask, isSelectedFocusTaskCompleted])

  const activeTaskLabel = getFocusTaskSelectLabel(tasks, selectedTaskId)
  const displayedActiveTaskLabel = activeFocusTask?.title ?? activeTaskLabel
  const timerLabel = formatFocusTime(remainingSeconds)
  const isCompleting = completeSession.isPending
  const isCompletingTask = completeTask.isPending

  if (isLoadingSettings) {
    return (
      <div className={cn(
        "flex min-h-[320px] items-center justify-center",
        isEmbedded ? "rounded-xl border border-border/60 bg-card text-muted-foreground" : "min-h-[80vh] bg-[#0C0C0B] text-[#F6F6F3]"
      )}>
        <AiThinking text="Cargando foco..." />
      </div>
    )
  }

  const setupContent = isEmbedded ? (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="rounded-xl border border-border/60 bg-card p-4 md:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/60 text-muted-foreground">
            <Timer className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-foreground">Sesión</h2>
            <p className="text-xs text-muted-foreground">Elegí una tarea y el ritmo de trabajo.</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Tarea activa
            </label>
            <Select
              value={selectedTaskId}
              onValueChange={(value) => setSelectedTaskId(value ?? FOCUS_FREE_SESSION_ID)}
            >
              <SelectTrigger className="h-11 w-full border-input bg-background text-foreground hover:bg-muted/50">
                <SelectValue placeholder="Sesión libre">{activeTaskLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FOCUS_FREE_SESSION_ID}>Sesión libre</SelectItem>
                {tasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Ritmo
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["pomodoro", "custom"] as FocusMode[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  aria-pressed={mode === item}
                  className={cn(
                    "min-h-11 cursor-pointer rounded-lg border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    mode === item
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {item === "pomodoro" ? "25 / 5" : "Personal"}
                </button>
              ))}
            </div>
          </div>

          {mode === "custom" && (
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Trabajo</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={workMinutes}
                  onChange={(event) => setWorkMinutes(Number(event.target.value))}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Descanso</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={breakMinutes}
                  onChange={(event) => setBreakMinutes(Number(event.target.value))}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
                />
              </label>
            </div>
          )}

          <Button type="button" onClick={startFocus} className="w-full">
            <Play className="h-4 w-4" aria-hidden="true" />
            Iniciar foco
          </Button>
        </div>
      </div>

      <aside className="rounded-xl border border-border/60 bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-sm font-medium text-foreground">Hoy</h2>
          </div>
          <span className="text-sm tabular-nums text-muted-foreground">{completedSessions} sesiones</span>
        </div>
        <div className="mt-4 divide-y divide-border/60">
          {tasks.slice(0, 4).map((task) => (
            <div key={task.id} className="py-3 first:pt-0 last:pb-0">
              <p className="text-sm text-foreground">{task.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">Prioridad {task.priority ?? 2}</p>
            </div>
          ))}
          {!tasks.length && (
            <p className="text-sm leading-6 text-muted-foreground">No hay tareas pendientes para vincular.</p>
          )}
        </div>
      </aside>
    </section>
  ) : (
    <div className="min-h-[calc(100vh-64px)] bg-[#0C0C0B] px-4 py-8 text-[#F6F6F3] md:min-h-screen md:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.1em] text-[#F6F6F3]/40">Modo foco</p>
            <h1 className="mt-2 text-3xl font-extralight tracking-normal text-[#F6F6F3]">Estudiá sin ruido</h1>
            <p className="mt-3 max-w-xl text-sm font-light leading-6 text-[#F6F6F3]/55">
              Elegí una tarea, definí el ritmo y entrá a una pantalla limpia. El progreso se registra al terminar cada bloque de trabajo.
            </p>
          </div>
          <div className="rounded-lg border border-[#F6F6F3]/10 px-4 py-3 text-sm text-[#F6F6F3]/60">
            <span className="tabular-nums text-[#F6F6F3]">{completedSessions}</span> sesiones hoy
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-xl border border-[#F6F6F3]/10 bg-[#1E1E1C]/80 p-5 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#F6F6F3]/10 text-[#F6F6F3]/60">
                <Timer className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm font-medium text-[#F6F6F3]">Sesión</h2>
                <p className="text-xs text-[#F6F6F3]/45">Pomodoro clásico o intervalo propio.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.08em] text-[#F6F6F3]/45">
                  Tarea activa
                </label>
                <Select
                  value={selectedTaskId}
                  onValueChange={(value) => setSelectedTaskId(value ?? FOCUS_FREE_SESSION_ID)}
                >
                  <SelectTrigger className="h-11 w-full border-[#F6F6F3]/15 bg-[#0C0C0B]/30 text-[#F6F6F3] hover:bg-[#F6F6F3]/5">
                    <SelectValue placeholder="Sesión libre">{activeTaskLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FOCUS_FREE_SESSION_ID}>Sesión libre</SelectItem>
                    {tasks.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.08em] text-[#F6F6F3]/45">
                  Ritmo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["pomodoro", "custom"] as FocusMode[]).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setMode(item)}
                      aria-pressed={mode === item}
                      className={cn(
                        "min-h-11 rounded-lg border px-3 text-sm transition-colors",
                        mode === item
                          ? "border-[#2282fa] bg-[#2282fa]/10 text-[#2282fa]"
                          : "border-[#F6F6F3]/15 text-[#F6F6F3]/60 hover:bg-[#F6F6F3]/5"
                      )}
                    >
                      {item === "pomodoro" ? "25 / 5" : "Personal"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {mode === "custom" && (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-medium uppercase tracking-[0.08em] text-[#F6F6F3]/45">Trabajo</span>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={workMinutes}
                    onChange={(event) => setWorkMinutes(Number(event.target.value))}
                    className="h-11 w-full rounded-lg border border-[#F6F6F3]/15 bg-[#0C0C0B]/30 px-3 text-sm text-[#F6F6F3] outline-none focus:border-[#2282fa] focus:ring-3 focus:ring-[#2282fa]/15"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-medium uppercase tracking-[0.08em] text-[#F6F6F3]/45">Descanso</span>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={breakMinutes}
                    onChange={(event) => setBreakMinutes(Number(event.target.value))}
                    className="h-11 w-full rounded-lg border border-[#F6F6F3]/15 bg-[#0C0C0B]/30 px-3 text-sm text-[#F6F6F3] outline-none focus:border-[#2282fa] focus:ring-3 focus:ring-[#2282fa]/15"
                  />
                </label>
              </div>
            )}

            <Button
              type="button"
              onClick={startFocus}
              className="mt-6 h-11 w-full bg-[#F6F6F3] text-[#0C0C0B] hover:bg-[#F6F6F3]/90"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              Iniciar foco
            </Button>
          </div>

          <aside className="rounded-xl border border-[#F6F6F3]/10 bg-[#1E1E1C]/60 p-5">
            <div className="flex items-center gap-3">
              <ListTodo className="h-4 w-4 text-[#F6F6F3]/45" aria-hidden="true" />
              <h2 className="text-sm font-medium text-[#F6F6F3]">Pendientes</h2>
            </div>
            <div className="mt-4 space-y-3">
              {tasks.slice(0, 5).map((task) => (
                <div key={task.id} className="rounded-lg border border-[#F6F6F3]/10 px-3 py-2">
                  <p className="text-sm text-[#F6F6F3]/80">{task.title}</p>
                  <p className="mt-1 text-xs text-[#F6F6F3]/35">
                    Prioridad {task.priority ?? 2}
                  </p>
                </div>
              ))}
              {!tasks.length && (
                <p className="text-sm leading-6 text-[#F6F6F3]/45">No hay tareas pendientes para vincular.</p>
              )}
            </div>
          </aside>
        </section>
      </div>
    </div>
  )

  return (
    <>
      {setupContent}
      <AnimatePresence>
        {isActive && (
          <motion.section
            key="active-focus"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.3 }}
            className="fixed inset-0 z-[90] flex min-h-dvh flex-col items-center justify-center bg-[#0C0C0B] px-6 text-center text-[#F6F6F3]"
            aria-label="Modo foco activo"
          >
            <motion.div
              initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.3, delay: reduceMotion ? 0 : 0.2 }}
              className="flex w-full max-w-xl flex-col items-center"
            >
              <p className="max-w-full truncate text-[15px] font-light text-[#F6F6F3]/50">
                {phase === "work" ? displayedActiveTaskLabel : "Descanso"}
              </p>
              <motion.div
                key={Math.floor(remainingSeconds / 60)}
                initial={reduceMotion ? false : { scale: 1.04 }}
                animate={{ scale: 1 }}
                transition={{ duration: reduceMotion ? 0 : 0.3 }}
                className="mt-5 text-[64px] font-extralight leading-none tabular-nums text-[#F6F6F3] md:text-[84px]"
              >
                {timerLabel}
              </motion.div>
              <div className="mt-7 h-0.5 w-[80%] max-w-[280px] overflow-hidden rounded-full bg-[#F6F6F3]/10">
                <div
                  className="h-full rounded-full bg-[#2282fa] transition-[width] duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsRunning((current) => !current)}
                  className="text-[#F6F6F3]/55 hover:bg-[#F6F6F3]/10 hover:text-[#F6F6F3]"
                >
                  {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {isRunning ? "Pausa" : "Seguir"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={resetSession}
                  className="text-[#F6F6F3]/45 hover:bg-[#F6F6F3]/10 hover:text-[#F6F6F3]"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Reiniciar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={stopFocus}
                  className="text-[#F6F6F3]/45 hover:bg-[#F6F6F3]/10 hover:text-[#F6F6F3]"
                >
                  <Square className="h-4 w-4" aria-hidden="true" />
                  Salir del foco
                </Button>
              </div>

              <p className="mt-5 text-sm tabular-nums text-[#F6F6F3]/30">
                {completedSessions} / 4
              </p>

              <div className={FOCUS_ACTIVE_TASK_PANEL_CLASS}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <ListTodo className="h-4 w-4 shrink-0 text-[#F6F6F3]/35" aria-hidden="true" />
                    <p className="truncate text-xs font-medium uppercase tracking-[0.08em] text-[#F6F6F3]/45">
                      {activeFocusTask ? "Tarea seleccionada" : "Pendientes"}
                    </p>
                  </div>
                  {activeFocusTask && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={completeFocusedTask}
                      disabled={isCompletingTask || isSelectedFocusTaskCompleted}
                      aria-label="Marcar tarea seleccionada como terminada"
                      className="h-8 min-h-8 rounded-md px-2 text-xs text-[#F6F6F3]/60 hover:bg-[#F6F6F3]/10 hover:text-[#F6F6F3] disabled:opacity-45"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      {isSelectedFocusTaskCompleted ? "Completada" : "Terminado"}
                    </Button>
                  )}
                </div>

                <div className="mt-3 space-y-2">
                  {focusPanelTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start justify-between gap-3 rounded-md border border-[#F6F6F3]/8 bg-[#0C0C0B]/25 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "truncate text-sm text-[#F6F6F3]/78",
                            completedFocusTaskId === task.id && "text-[#F6F6F3]/35 line-through"
                          )}
                        >
                          {task.title}
                        </p>
                        <p className="mt-1 text-xs text-[#F6F6F3]/30">Prioridad {task.priority ?? 2}</p>
                      </div>
                      {completedFocusTaskId === task.id && (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2282fa]" aria-hidden="true" />
                      )}
                    </div>
                  ))}
                  {!focusPanelTasks.length && (
                    <p className="rounded-md border border-[#F6F6F3]/8 bg-[#0C0C0B]/25 px-3 py-2 text-sm text-[#F6F6F3]/35">
                      No hay tareas pendientes.
                    </p>
                  )}
                </div>
              </div>

              {isCompleting && (
                <div className="mt-4">
                  <AiThinking text="Registrando..." />
                </div>
              )}

              {spotifyEmbed && !spotifyUnavailable && (
                <div className="mt-8 w-full max-w-md overflow-hidden rounded-lg border border-[#F6F6F3]/10 bg-[#1E1E1C]">
                  <iframe
                    title="Playlist de foco en Spotify"
                    src={spotifyEmbed.embedUrl}
                    width="100%"
                    height="152"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    onError={() => setSpotifyUnavailable(true)}
                    className="block"
                  />
                </div>
              )}

              {(!spotifyEmbed || spotifyUnavailable) && (
                <div className="mt-8 flex items-center gap-2 rounded-lg border border-[#F6F6F3]/10 px-3 py-2 text-xs text-[#F6F6F3]/35">
                  <Music2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Spotify no disponible. El temporizador sigue activo.
                </div>
              )}
            </motion.div>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  )
}
