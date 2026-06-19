"use client"

import * as React from "react"
import { Clock, Loader2 } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { cn } from "@/lib/utils"
import type { SubjectStatus } from "@/server/schema/subject"
import { ScheduleEditDialog } from "./schedule-edit-dialog"

const DAYS = [
  { label: "Lun", aliases: ["Lun"] },
  { label: "Mar", aliases: ["Mar"] },
  { label: "Mie", aliases: ["Mie", "Mi\u00e9", "Mi\u00c3\u00a9"] },
  { label: "Jue", aliases: ["Jue"] },
  { label: "Vie", aliases: ["Vie"] },
]

interface ScheduleSession {
  day: string
  start: string
  end: string
  room?: string | null
}

interface WeeklySubject {
  id: string
  name: string
  code: string | null
  status: SubjectStatus
  weekly_hours: number | null
  schedules?: ScheduleSession[] | null
}

export function WeeklySchedule() {
  const { data: subjects, isLoading } = trpc.subjects.list.useQuery()

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20 opacity-50">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  const activeSubjects = ((subjects ?? []) as WeeklySubject[]).filter(
    (subject) => subject.status === "in_progress" || subject.status === "pending"
  )

  const highlightedSubjects = activeSubjects.filter(
    (subject) =>
      (subject.weekly_hours !== null && subject.weekly_hours > 0) ||
      (subject.schedules !== null && subject.schedules !== undefined && subject.schedules.length > 0)
  )

  if (highlightedSubjects.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end pt-2">
          <ScheduleEditDialog />
        </div>
        <div className="text-center py-12 border border-dashed rounded-xl bg-muted/10">
          <Clock className="w-8 h-8 mx-auto text-muted-foreground opacity-50 mb-3" />
          <p className="text-sm text-muted-foreground max-w-[240px] mx-auto">
            No hay horarios definidos. Carga horas semanales o gestiona tus sesiones de clase.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="space-y-0.5">
          <h2 className="text-sm font-medium">Cronograma de cursada</h2>
          <p className="text-xs text-muted-foreground">Calendario semanal de clases y sesiones</p>
        </div>
        <ScheduleEditDialog />
      </div>

      <div className="rounded-xl border bg-card/50 overflow-hidden shadow-sm backdrop-blur-sm">
        <div className="grid grid-cols-6 border-b bg-muted/40 divide-x">
          <div className="p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Materia</div>
          {DAYS.map((day) => (
            <div key={day.label} className="p-3 text-xs font-medium text-center text-muted-foreground uppercase tracking-wider">
              {day.label}
            </div>
          ))}
        </div>

        {highlightedSubjects.map((subject, index) => {
          const manualSessions = subject.schedules ?? []
          const hasManual = manualSessions.length > 0
          const fallbackWeekly = subject.weekly_hours ?? 0
          const hoursPerDay = fallbackWeekly / 5

          return (
            <div
              key={subject.id}
              className={cn(
                "grid grid-cols-6 divide-x",
                index < highlightedSubjects.length - 1 && "border-b"
              )}
            >
              <div className="p-4 flex flex-col justify-center min-w-0 bg-muted/10 group">
                <div className="flex items-center gap-2">
                  <div
                    className="w-1.5 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: "#2282fa" }}
                  />
                  <span className="text-sm font-medium truncate" style={{ fontWeight: 500 }}>{subject.name}</span>
                </div>
                {subject.code && <span className="text-[10px] text-muted-foreground ml-3.5">{subject.code}</span>}
              </div>

              {DAYS.map((day, dayIndex) => {
                const sessionsToday = manualSessions.filter((session) => day.aliases.includes(session.day))
                const hasFallbackClass = !hasManual && dayIndex < Math.ceil(fallbackWeekly / Math.ceil(hoursPerDay || 1))
                const fallbackTime = hasFallbackClass ? Math.ceil(hoursPerDay) : 0

                return (
                  <div
                    key={day.label}
                    className="p-3 flex flex-col items-center justify-center min-h-[72px] relative overflow-hidden"
                  >
                    {hasManual ? (
                      sessionsToday.map((session, sessionIndex) => (
                        <div
                          key={`${session.day}-${session.start}-${sessionIndex}`}
                          className="w-full flex flex-col items-center justify-center p-1.5 rounded-lg bg-accent/5 ring-1 ring-accent/10 border border-accent/20 my-0.5"
                        >
                          <span className="text-[10px] font-medium text-accent leading-none">
                            {session.start}-{session.end}
                          </span>
                          {session.room && (
                            <span className="text-[9px] text-muted-foreground mt-0.5 opacity-70">Aula {session.room}</span>
                          )}
                        </div>
                      ))
                    ) : fallbackTime > 0 ? (
                      <span className="text-xs font-medium tabular-nums px-2 py-1.5 rounded-md bg-stone-100 dark:bg-stone-800/60 text-stone-600 dark:text-stone-300 ring-1 ring-stone-200/50">
                        {fallbackTime}h
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/20">-</span>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span>El sistema prioriza los horarios especificos guardados. De lo contrario, distribuye las horas semanales automaticamente.</span>
      </div>
    </div>
  )
}
