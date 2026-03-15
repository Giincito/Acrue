"use client"

import * as React from "react"
import { Calendar as BigCalendar, dateFnsLocalizer, View, Views } from "react-big-calendar"
import format from "date-fns/format"
import parse from "date-fns/parse"
import startOfWeek from "date-fns/startOfWeek"
import getDay from "date-fns/getDay"
import es from "date-fns/locale/es"
import "react-big-calendar/lib/css/react-big-calendar.css"
import { trpc } from "@/lib/trpc"
import { Loader2 } from "lucide-react"

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

export function CalendarView() {
  const [view, setView] = React.useState<View>(Views.MONTH)
  const [date, setDate] = React.useState(new Date())
  
  // Fetch tasks and google calendar events to populate calendar
  const { data: tasks, isLoading: tasksLoading } = trpc.tasks.list.useQuery()
  const { data: googleEvents, isLoading: googleLoading } = trpc.integrations.googleCalendarEvents.useQuery(undefined, {
    retry: false // don't retry if it fails (withFallback)
  })

  const isLoading = tasksLoading || googleLoading

  const events = React.useMemo(() => {
    const calendarEvents: any[] = []
    
    // Add local tasks
    if (tasks) {
      calendarEvents.push(...tasks
        .filter((task) => task.due_at)
        .map((task) => ({
          id: task.id,
          title: task.title,
          start: new Date(task.due_at!),
          end: new Date(task.due_at!),
          allDay: true,
          resource: task,
          type: 'task'
        })))
    }

    // Add Google Events
    if (googleEvents) {
      calendarEvents.push(...googleEvents.map((ev) => ({
        id: ev.id,
        title: ev.title,
        start: new Date(ev.start),
        end: new Date(ev.end),
        allDay: !ev.start.includes("T"), // Simplistic all day check for RFC3339
        resource: ev,
        type: 'google'
      })))
    }

    return calendarEvents
  }, [tasks, googleEvents])


  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20 h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground opacity-50" />
      </div>
    )
  }

  return (
    <div className="h-[600px] bg-background border rounded-xl shadow-sm p-4 pt-6 calendar-container">
      <style dangerouslySetInnerHTML={{__html: `
        .rbc-calendar { font-family: inherit; }
        .rbc-btn-group > button {
          color: hsl(var(--foreground));
          border-color: hsl(var(--border));
        }
        .rbc-btn-group > button.rbc-active {
          background-color: hsl(var(--accent));
          color: hsl(var(--accent-foreground));
          box-shadow: none;
        }
        .rbc-btn-group > button:hover:not(.rbc-active) {
          background-color: hsl(var(--accent) / 0.5);
        }
        .rbc-today {
          background-color: hsl(var(--accent) / 0.1);
        }
        .rbc-event {
          background-color: #2282fa;
        }
        .rbc-off-range-bg {
          background-color: hsl(var(--muted) / 0.3);
        }
      `}} />
      <BigCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: "100%" }}
        view={view}
        onView={setView}
        date={date}
        onNavigate={setDate}
        culture="es"
        messages={{
          next: "Sig.",
          previous: "Ant.",
          today: "Hoy",
          month: "Mes",
          week: "Semana",
          day: "Día",
          agenda: "Agenda",
        }}
      />
    </div>
  )
}
