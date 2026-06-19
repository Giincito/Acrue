"use client"

import * as React from "react"
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
  View,
  Views,
  type Components,
  type DateHeaderProps,
  type EventProps,
  type HeaderProps as CalendarHeaderProps,
  type NavigateAction,
  type ToolbarProps as CalendarToolbarProps,
} from "react-big-calendar"
import { format, parse, startOfWeek, getDay } from "date-fns"
import { es } from "date-fns/locale/es"
import "react-big-calendar/lib/css/react-big-calendar.css"
import "./calendar-view.css"
import { trpc } from "@/lib/trpc"
import { GENERIC_COLOR_OPTIONS } from "@/lib/generic-colors"
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CreateReminderForm } from "@/components/reminders/create-reminder-form"
import { Button } from "@/components/ui/button"
import { ModuleHeader } from "@/components/layout/module-header"
import { DegradedNotice } from "@/components/shared/degraded-notice"
import { TaskDetailsDrawer } from "@/components/tasks/task-details-drawer"
import { ReminderDetailsDrawer } from "@/components/reminders/reminder-details-drawer"
import { GoogleEventDrawer, type GoogleCalendarEvent } from "@/components/calendar/google-event-drawer"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { Task } from "@/store/useTaskStore"

const viewNames: Record<string, string> = {
  month: "Mensual",
  week: "Semanal",
  day: "Diaria",
  agenda: "Agenda",
}

const CALENDAR_CREATE_EVENT_BUTTON_CLASS =
  "h-[38px] min-h-[38px] rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground shadow-sm hover:bg-accent/90"

function isCalendarView(value: string | null): value is View {
  return value === Views.MONTH || value === Views.WEEK || value === Views.DAY || value === Views.AGENDA
}

interface CalendarReminder {
  id: string
  title: string
  description: string | null
  trigger_at: string
  trigger_end_at: string | null
  is_all_day: boolean
  is_completed: boolean
  color: string | null
}

type CalendarDisplayEvent =
  | {
      id: string
      title: string
      start: Date
      end: Date
      allDay: boolean
      resource: Task
      type: 'task'
    }
  | {
      id: string
      title: string
      start: Date
      end: Date
      allDay: boolean
      resource: GoogleCalendarEvent
      type: 'google'
    }
  | {
      id: string
      title: string
      start: Date
      end: Date
      allDay: boolean
      resource: CalendarReminder
      type: 'reminder'
    }

interface ToolbarProps {
  date: Date
  view: View
  onNavigate: (action: NavigateAction) => void
  onView: (view: View) => void
  onAddEvent: () => void
}

const CustomToolbar = ({ date, view, onNavigate, onView, onAddEvent }: ToolbarProps) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
      {/* Date Information */}
      <div className="flex items-center gap-4">
        {/* Date Icon */}
        <div className="flex flex-col w-[52px] h-[52px] rounded-xl overflow-hidden bg-background shadow-sm border border-border/50">
          <div className="bg-foreground text-background text-[11px] font-medium uppercase text-center py-[3px] tracking-wider leading-none">
            {format(date, "MMM", { locale: es })}
          </div>
          <div className="flex-1 flex items-center justify-center text-foreground font-medium text-[22px] bg-card leading-none">
            {format(date, "d")}
          </div>
        </div>
        {/* Text */}
        <div className="flex flex-col">
          <h2 className="text-xl font-medium text-foreground capitalize">
            {format(date, "MMMM d, yyyy", { locale: es })}
          </h2>
          <p className="text-sm text-muted-foreground capitalize font-medium">
            {format(date, "EEEE", { locale: es })}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search */}
        <Button aria-label="Buscar eventos" variant="outline" size="icon" className="h-[38px] min-h-[38px] w-[38px] min-w-[38px] rounded-xl border-border/80 bg-card shadow-sm hover:bg-muted/50 hidden sm:flex">
          <Search className="w-4 h-4 text-foreground/80" strokeWidth={2.5} />
        </Button>

        {/* Navigation */}
        <div className="flex h-[38px] items-center overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
          <button
            type="button"
            onClick={() => onNavigate('PREV')}
            aria-label="Ir al periodo anterior"
            className="flex h-full min-h-[38px] min-w-[38px] items-center justify-center border-r border-border/50 px-3 transition-colors hover:bg-muted/50"
          >
            <ChevronLeft className="w-[18px] h-[18px] text-foreground/70" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => onNavigate('TODAY')}
            className="flex h-full min-h-[38px] min-w-0 items-center justify-center border-r border-border/50 bg-card px-4 text-[13px] font-medium transition-colors hover:bg-muted/50"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => onNavigate('NEXT')}
            aria-label="Ir al periodo siguiente"
            className="flex h-full min-h-[38px] min-w-[38px] items-center justify-center px-3 transition-colors hover:bg-muted/50"
          >
            <ChevronRight className="w-[18px] h-[18px] text-foreground/70" strokeWidth={2.5} />
          </button>
        </div>

        {/* View Select */}
        <Select value={view} onValueChange={(v) => onView(v as View)}>
          <SelectTrigger className="h-[38px] min-h-[38px] w-[145px] bg-card border border-border/80 rounded-xl font-medium text-[13px] shadow-sm capitalize">
            <span className="flex-1 text-left">{viewNames[view] || "Vista"}</span>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="month">Mensual</SelectItem>
            <SelectItem value="week">Semanal</SelectItem>
            <SelectItem value="day">Diaria</SelectItem>
            <SelectItem value="agenda">Agenda</SelectItem>
          </SelectContent>
        </Select>

        {/* Add Event */}
        <Button
          onClick={onAddEvent}
          className={CALENDAR_CREATE_EVENT_BUTTON_CLASS}
        >
          <Plus className="mr-2 h-5 w-5" />
          Crear evento
        </Button>
      </div>
    </div>
  )
}

// Setup localizer for react-big-calendar
const locales = {
  "es": es,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), // Starts on Monday
  getDay,
  locales,
})

interface CalendarEventTone {
  background: string
  foreground: string
}

const calendarEventTones = {
  accent: {
    background: "color-mix(in srgb, var(--accent) 12%, transparent)",
    foreground: "var(--accent)",
  },
  success: {
    background: "color-mix(in srgb, var(--success) 14%, transparent)",
    foreground: "var(--success)",
  },
  warning: {
    background: "color-mix(in srgb, var(--warning) 14%, transparent)",
    foreground: "var(--warning)",
  },
  destructive: {
    background: "color-mix(in srgb, var(--destructive) 14%, transparent)",
    foreground: "var(--destructive)",
  },
  neutral: {
    background: "var(--secondary)",
    foreground: "var(--foreground)",
  },
  muted: {
    background: "color-mix(in srgb, var(--muted-foreground) 14%, transparent)",
    foreground: "var(--muted-foreground)",
  },
} satisfies Record<string, CalendarEventTone>

const taskColorToneMap: Record<string, CalendarEventTone> = {
  "#2282fa": calendarEventTones.accent,
  "#3a7d44": calendarEventTones.success,
  "#a0742a": calendarEventTones.warning,
  "#9b3a3a": calendarEventTones.destructive,
  "#0c0c0b": calendarEventTones.neutral,
  "#3c3c3a": calendarEventTones.neutral,
  "#888884": calendarEventTones.muted,
  "#c8c8c2": calendarEventTones.muted,
  "#eaeae6": calendarEventTones.muted,
  ...Object.fromEntries(
    GENERIC_COLOR_OPTIONS.map((option) => [
      option.value.toLowerCase(),
      {
        background: `color-mix(in srgb, ${option.value} 14%, transparent)`,
        foreground: option.value,
      } satisfies CalendarEventTone,
    ])
  ),
}

function getCalendarEventTone(event: CalendarDisplayEvent): CalendarEventTone {
  if (event.type === "google") return calendarEventTones.muted
  if (event.type === "reminder") {
    if (event.resource.is_completed) return calendarEventTones.success

    const reminderColor = event.resource.color?.trim().toLowerCase()
    if (reminderColor && reminderColor !== "ninguno") {
      return taskColorToneMap[reminderColor] ?? calendarEventTones.warning
    }

    return calendarEventTones.warning
  }

  if (event.resource.completed_at || event.resource.status === "completed") return calendarEventTones.success

  const taskColor = event.resource.color?.trim().toLowerCase()
  if (taskColor && taskColor !== "ninguno") {
    return taskColorToneMap[taskColor] ?? calendarEventTones.accent
  }

  return calendarEventTones.accent
}

function AgendaEventPill({ event, title }: EventProps<CalendarDisplayEvent>) {
  const tone = getCalendarEventTone(event)

  return (
    <div
      className="agenda-event-pill"
      style={
        {
          "--agenda-event-bg": tone.background,
          "--agenda-event-fg": tone.foreground,
        } as React.CSSProperties
      }
      title={String(title)}
    >
      <span className="agenda-event-title">{title}</span>
    </div>
  )
}

function CalendarLoadingState() {
  return (
    <div className="calendar-view-scope bg-background font-sans flex flex-col gap-4">
      <ModuleHeader
        module="Calendario"
        title="Calendario"
        description="Eventos, tareas y recordatorios en una vista de tiempo."
        className="mb-2 pt-4"
      />
      <div aria-busy="true" aria-label="Cargando calendario" className="mt-2 mb-8 min-h-[800px] rounded-lg border border-border bg-card">
        <div className="h-full min-h-[800px] animate-pulse rounded-lg bg-muted/30" />
      </div>
    </div>
  )
}

export function CalendarView() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const viewParam = searchParams.get("view")
  const [isMounted, setIsMounted] = React.useState(false)
  const [view, setView] = React.useState<View>(Views.MONTH)
  const [date, setDate] = React.useState(new Date())

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  // Sync view with URL param
  React.useEffect(() => {
    if (isCalendarView(viewParam)) {
      setView(viewParam)
    }
  }, [viewParam])

  // Dialog state
  const [isReminderOpen, setIsReminderOpen] = React.useState(false)
  const [selectedDateRange, setSelectedDateRange] = React.useState<{ start: string, end: string } | null>(null)

  // Details Drawers state
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null)
  const [isTaskOpen, setIsTaskOpen] = React.useState(false)
  const [selectedReminderId, setSelectedReminderId] = React.useState<string | null>(null)
  const [isReminderDetailOpen, setIsReminderDetailOpen] = React.useState(false)

  const [selectedGoogleEvent, setSelectedGoogleEvent] = React.useState<GoogleCalendarEvent | null>(null)
  const [isGoogleOpen, setIsGoogleOpen] = React.useState(false)

  // Fetch data
  const { data: tasks } = trpc.tasks.list.useQuery()
  const { data: reminders } = trpc.reminders.list.useQuery()
  const googleEventsQuery = trpc.integrations.googleCalendarEvents.useQuery(undefined, {
    retry: false // don't retry if it fails (withFallback)
  })
  const googleEvents = googleEventsQuery.data

  const events = React.useMemo(() => {
    const calendarEvents: CalendarDisplayEvent[] = []

    const combineDateAndTime = (dateIso: string, timeStr?: string | null) => {
      if (!timeStr) return new Date(dateIso);
      // Ensure we have a valid ISO date part
      const datePart = dateIso.includes('T') ? dateIso.split('T')[0] : dateIso;
      // Combine date and time. Using the local timezone for parsing if no 'Z' suffix is added to time
      return new Date(`${datePart}T${timeStr}`);
    };

    if (tasks) {
      calendarEvents.push(...tasks
        .filter((task) => task.due_at)
        .map((task): CalendarDisplayEvent => {
          const start = combineDateAndTime(task.due_at!, task.start_time);
          // If no end time, ensure it has some duration for the time-grid
          const end = task.end_time
            ? combineDateAndTime(task.due_at!, task.end_time)
            : new Date(start.getTime() + 30 * 60000); // 30 min duration default

          return {
            id: task.id,
            title: `[Tarea] ${task.title}`,
            start,
            end,
            allDay: task.is_all_day || false,
            resource: task,
            type: 'task'
          };
        }))
    }

    // Add Google Events
    if (googleEvents) {
      calendarEvents.push(...googleEvents.map((ev): CalendarDisplayEvent => ({
        id: ev.id,
        title: ev.title,
        start: new Date(ev.start),
        end: new Date(ev.end ?? ev.start),
        allDay: !ev.start.includes("T"), // Simplistic all day check for RFC3339
        resource: ev,
        type: 'google'
      })))
    }

    // Add Reminders
    if (reminders) {
      const reminderRows = reminders as CalendarReminder[]
      calendarEvents.push(...reminderRows.map((rem): CalendarDisplayEvent => ({
        id: rem.id,
        title: rem.title,
        start: new Date(rem.trigger_at),
        end: rem.trigger_end_at ? new Date(rem.trigger_end_at) : new Date(rem.trigger_at),
        allDay: rem.is_all_day,
        resource: rem,
        type: 'reminder'
      })))
    }

    return calendarEvents
  }, [tasks, googleEvents, reminders])

  const handleSelectSlot = ({ start, end }: { start: Date, end: Date }) => {
    // Determine if it was a drag range by checking if start and end are on different days or times
    // For single clicks on month view, start and end are exactly 1 day apart.
    // However, BigCalendar gives us the literal end. Let's just pass both.
    setSelectedDateRange({ start: start.toISOString(), end: end.toISOString() })
    setIsReminderOpen(true)
  }

  const handleSelectEvent = (event: CalendarDisplayEvent) => {
    if (event.type === 'task') {
      setSelectedTaskId(event.id)
      setIsTaskOpen(true)
    } else if (event.type === 'reminder') {
      setSelectedReminderId(event.id)
      setIsReminderDetailOpen(true)
    } else if (event.type === 'google') {
      setSelectedGoogleEvent(event.resource)
      setIsGoogleOpen(true)
    }
  }

  function handleViewChange(nextView: View) {
    setView(nextView)

    const nextSearchParams = new URLSearchParams(searchParams.toString())
    nextSearchParams.set("view", nextView)
    router.replace(`${pathname}?${nextSearchParams.toString()}`, { scroll: false })
    window.history.replaceState(window.history.state, "", `${pathname}?${nextSearchParams.toString()}`)
  }

  const components: Components<CalendarDisplayEvent> = {
    toolbar: (props: CalendarToolbarProps<CalendarDisplayEvent>) => (
      <CustomToolbar
        {...props}
        onAddEvent={() => { setSelectedDateRange(null); setIsReminderOpen(true) }}
      />
    ),
    month: {
      dateHeader: ({ date, label }: DateHeaderProps) => {
        const isToday = new Date().toDateString() === date.toDateString();

        const headerClass = isToday ? "rbc-date-label rbc-today-badge" : "rbc-date-label";

        return (
          <span className={headerClass}>
            {label}
          </span>
        );
      }
    },
    week: {
      header: ({ date, localizer }: CalendarHeaderProps) => {
        const isToday = new Date().toDateString() === date.toDateString();
        const dayName = localizer.format(date, 'cccc').toUpperCase();
        const dayNumber = localizer.format(date, 'd');

        let containerClass = 'bg-card text-foreground border-border/50';
        if (isToday) {
          containerClass = 'border-accent bg-accent/10 text-accent';
        }

        return (
          <div className={`flex flex-col items-center justify-center p-2 rounded-lg mx-auto mb-2 w-[76px] h-[76px] shadow-sm border ${containerClass}`}>
            <span className="text-[9px] font-medium tracking-wider opacity-90 truncate w-full text-center">{dayName}</span>
            <span className="text-[22px] font-medium mt-0.5">{dayNumber}</span>
          </div>
        );
      }
    },
    day: {
      header: ({ date, localizer }: CalendarHeaderProps) => {
        const isToday = new Date().toDateString() === date.toDateString();
        const dayName = localizer.format(date, 'cccc').toUpperCase();
        const dayNumber = localizer.format(date, 'd');

        let containerClass = 'bg-card text-foreground border-border/50';
        if (isToday) {
          containerClass = 'border-accent bg-accent/10 text-accent';
        }

        return (
          <div className={`flex flex-col items-center justify-center p-2 rounded-lg mx-auto mb-2 w-[76px] h-[76px] shadow-sm border ${containerClass}`}>
            <span className="text-[9px] font-medium tracking-wider opacity-90 truncate w-full text-center">{dayName}</span>
            <span className="text-[22px] font-medium mt-0.5">{dayNumber}</span>
          </div>
        );
      }
    },
    agenda: {
      event: AgendaEventPill
    }
  }

  if (!isMounted) return <CalendarLoadingState />

  return (
    <div className="calendar-view-scope bg-background font-sans flex flex-col gap-4">
      <ModuleHeader
        module="Calendario"
        title={viewNames[view] || "Vista"}
        description="Eventos, tareas y recordatorios en una vista de tiempo."
        className="mb-2 pt-4"
      />

      {googleEventsQuery.error ? (
        <DegradedNotice
          title="Google Calendar no disponible"
          detail="Mostrando tareas y recordatorios locales. Reintentá cuando la integración vuelva a responder."
          onRetry={() => void googleEventsQuery.refetch()}
          className="mb-2"
        />
      ) : null}

      <BigCalendar
        className={`mt-2 mb-8 ${view === 'day' ? 'is-day-view' : ''}`}
        localizer={localizer}
        events={events}
        components={components}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 800, minHeight: 800 }}
        popup={true}
        view={view}
        onView={handleViewChange}
        date={date}
        onNavigate={setDate}
        culture="es"
        selectable={true}
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        eventPropGetter={(event: CalendarDisplayEvent) => {
          const tone = getCalendarEventTone(event)

          if (view === Views.AGENDA) {
            return {
              className: `event-${event.type}`,
              style: {
                backgroundColor: "transparent",
                color: "inherit",
                border: "none",
                outline: "none",
                boxSizing: "border-box"
              }
            }
          }

          return {
            className: `event-${event.type} hover:opacity-90`,
            style: {
              backgroundColor: tone.background,
              color: tone.foreground,
              '--event-bg': tone.background,
              '--event-fg': tone.foreground,
              outline: 'none',
              boxSizing: 'border-box'
            }
          }
        }}
        messages={{
          next: "Sig.",
          previous: "Ant.",
          today: "Hoy",
          month: "Mes",
          week: "Semana",
          day: "Día",
          agenda: "Agenda",
          date: "Fecha",
          time: "Hora",
          event: "Evento",
          allDay: "Todo el día",
          noEventsInRange: "No hay eventos ni tareas en este rango.",
        }}
      />

      <Dialog open={isReminderOpen} onOpenChange={setIsReminderOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Añadir recordatorio</DialogTitle>
          </DialogHeader>
          <div className="pt-4">
            <CreateReminderForm
              defaultTriggerAt={selectedDateRange?.start}
              defaultTriggerEndAt={selectedDateRange?.end}
              onSuccess={() => setIsReminderOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <TaskDetailsDrawer
        task={tasks?.find(t => t.id === selectedTaskId) || null}
        open={isTaskOpen}
        onOpenChange={setIsTaskOpen}
      />

      <ReminderDetailsDrawer
        reminder={(reminders as CalendarReminder[] | undefined)?.find((r) => r.id === selectedReminderId) || null}
        open={isReminderDetailOpen}
        onOpenChange={setIsReminderDetailOpen}
      />

      <GoogleEventDrawer
        event={selectedGoogleEvent}
        open={isGoogleOpen}
        onOpenChange={setIsGoogleOpen}
      />
    </div>
  )
}

