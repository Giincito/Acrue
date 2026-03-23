"use client"

import * as React from "react"
import { Calendar as BigCalendar, dateFnsLocalizer, View, Views } from "react-big-calendar"
import { format, parse, startOfWeek, getDay } from "date-fns"
import { es } from "date-fns/locale/es"
import "react-big-calendar/lib/css/react-big-calendar.css"
import { trpc } from "@/lib/trpc"
import { Loader2, Plus } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CreateReminderForm } from "@/components/reminders/create-reminder-form"
import { Button } from "@/components/ui/button"
import { TaskDetailsDrawer } from "@/components/tasks/task-details-drawer"
import { ReminderDetailsDrawer } from "@/components/reminders/reminder-details-drawer"
import { GoogleEventDrawer } from "@/components/calendar/google-event-drawer"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTheme } from "next-themes"

const viewNames: Record<string, string> = {
  month: "Mensual",
  week: "Semanal",
  day: "Diaria",
  agenda: "Agenda",
}

const CustomToolbar = ({ date, view, onNavigate, onView, onAddEvent }: any) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
      {/* Date Information */}
      <div className="flex items-center gap-4">
        {/* Date Icon */}
        <div className="flex flex-col w-[52px] h-[52px] rounded-xl overflow-hidden bg-background shadow-sm border border-border/50">
          <div className="bg-red-600 text-white text-[11px] font-bold uppercase text-center py-[3px] tracking-wider leading-none">
            {format(date, "MMM", { locale: es })}
          </div>
          <div className="flex-1 flex items-center justify-center text-foreground font-black text-[22px] bg-card leading-none">
            {format(date, "d")}
          </div>
        </div>
        {/* Text */}
        <div className="flex flex-col">
          <h2 className="text-xl font-bold tracking-tight text-foreground capitalize">
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
        <Button variant="outline" size="icon" className="w-[38px] h-[38px] rounded-xl border-border/80 shadow-sm bg-card hover:bg-muted/50 hidden sm:flex">
          <Search className="w-4 h-4 text-foreground/80" strokeWidth={2.5} />
        </Button>

        {/* Navigation */}
        <div className="flex items-center bg-card border border-border/80 rounded-xl overflow-hidden shadow-sm h-[38px]">
          <button 
            onClick={() => onNavigate('PREV')} 
            className="px-3 hover:bg-muted/50 h-full flex items-center justify-center border-r border-border/50 transition-colors"
          >
            <ChevronLeft className="w-[18px] h-[18px] text-foreground/70" strokeWidth={2.5} />
          </button>
          <button 
            onClick={() => onNavigate('TODAY')} 
            className="px-4 text-[13px] font-bold hover:bg-muted/50 h-full flex items-center justify-center border-r border-border/50 transition-colors bg-card"
          >
            Hoy
          </button>
          <button 
            onClick={() => onNavigate('NEXT')} 
            className="px-3 hover:bg-muted/50 h-full flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-[18px] h-[18px] text-foreground/70" strokeWidth={2.5} />
          </button>
        </div>

        {/* View Select */}
        <Select value={view} onValueChange={(v) => onView(v)}>
          <SelectTrigger className="w-[145px] h-[38px] bg-card border border-border/80 rounded-xl font-bold text-[13px] shadow-sm capitalize">
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
          className="h-[38px] rounded-xl bg-[#18181b] hover:bg-[#18181b]/90 text-white font-semibold text-[13px] px-5 shadow-md shadow-black/10 dark:bg-white dark:text-black dark:hover:bg-white/90"
        >
          <Plus className="w-[18px] h-[18px] mr-1.5" strokeWidth={2.5} />
          Crear Evento
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

export function CalendarView() {
  const { resolvedTheme } = useTheme()
  const [view, setView] = React.useState<View>(Views.MONTH)
  const [date, setDate] = React.useState(new Date())
  
  // Dialog state
  const [isReminderOpen, setIsReminderOpen] = React.useState(false)
  const [selectedDateRange, setSelectedDateRange] = React.useState<{ start: string, end: string } | null>(null)
  
  // Details Drawers state
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null)
  const [isTaskOpen, setIsTaskOpen] = React.useState(false)
  const [selectedReminderId, setSelectedReminderId] = React.useState<string | null>(null)
  const [isReminderDetailOpen, setIsReminderDetailOpen] = React.useState(false)
  
  const [selectedGoogleEvent, setSelectedGoogleEvent] = React.useState<any | null>(null)
  const [isGoogleOpen, setIsGoogleOpen] = React.useState(false)
  
  // Fetch data
  const { data: tasks, isLoading: tasksLoading } = trpc.tasks.list.useQuery()
  const { data: reminders, isLoading: remindersLoading } = trpc.reminders.list.useQuery()
  const { data: googleEvents, isLoading: googleLoading } = trpc.integrations.googleCalendarEvents.useQuery(undefined, {
    retry: false // don't retry if it fails (withFallback)
  })

  // Let googleEvents load in the background
  const isLoading = tasksLoading || remindersLoading

  const events = React.useMemo(() => {
    const calendarEvents: any[] = []
    
    if (tasks) {
      calendarEvents.push(...tasks
        .filter((task) => task.due_at)
        .map((task) => ({
          id: task.id,
          title: `[Tarea] ${task.title}`,
          start: new Date(task.start_time || task.due_at!),
          end: new Date(task.end_time || task.start_time || task.due_at!),
          allDay: !task.start_time,
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

    // Add Reminders
    if (reminders) {
      calendarEvents.push(...reminders.map((rem: any) => ({
        id: rem.id,
        title: rem.title,
        start: new Date(rem.trigger_at),
        end: rem.trigger_end_at ? new Date(rem.trigger_end_at) : new Date(rem.trigger_at), // support ranges
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

  const handleSelectEvent = (event: any) => {
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

  const components = {
    toolbar: (props: any) => (
      <CustomToolbar 
        {...props} 
        onAddEvent={() => { setSelectedDateRange(null); setIsReminderOpen(true) }} 
      />
    ),
    month: {
      dateHeader: ({ date, label }: any) => {
        const isToday = new Date().toDateString() === date.toDateString();
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        
        let headerClass = "rbc-date-label";
        if (isToday) {
          headerClass = isWeekend 
            ? "rbc-today-badge bg-[#E7000B] text-white" 
            : "rbc-today-badge bg-black text-white dark:bg-white dark:text-black";
        }

        return (
          <span className={headerClass}>
            {label}
          </span>
        );
      }
    },
    week: {
      header: ({ date, localizer }: any) => {
        const isToday = new Date().toDateString() === date.toDateString();
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const dayName = localizer.format(date, 'cccc').toUpperCase();
        const dayNumber = localizer.format(date, 'd');
        
        let containerClass = 'bg-card text-foreground border-border/50';
        if (isToday) {
          containerClass = isWeekend 
            ? 'bg-[#E7000B] text-white border-[#E7000B]' 
            : 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white';
        }

        return (
          <div className={`flex flex-col items-center justify-center p-2 rounded-2xl mx-auto mb-2 w-[76px] h-[76px] shadow-sm border ${containerClass}`}>
            <span className="text-[9px] font-bold tracking-wider opacity-90 truncate w-full text-center">{dayName}</span>
            <span className="text-[22px] font-bold mt-0.5 tracking-tight">{dayNumber}</span>
          </div>
        );
      }
    },
    day: {
      header: ({ date, localizer }: any) => {
        const isToday = new Date().toDateString() === date.toDateString();
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const dayName = localizer.format(date, 'cccc').toUpperCase();
        const dayNumber = localizer.format(date, 'd');
        
        let containerClass = 'bg-card text-foreground border-border/50';
        if (isToday) {
          containerClass = isWeekend 
            ? 'bg-[#E7000B] text-white border-[#E7000B]' 
            : 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white';
        }

        return (
          <div className={`flex flex-col items-center justify-center p-2 rounded-2xl mx-auto mb-2 w-[76px] h-[76px] shadow-sm border ${containerClass}`}>
            <span className="text-[9px] font-bold tracking-wider opacity-90 truncate w-full text-center">{dayName}</span>
            <span className="text-[22px] font-bold mt-0.5 tracking-tight">{dayNumber}</span>
          </div>
        );
      }
    }
  }

  return (
    <div className="bg-background font-sans flex flex-col gap-4">
      <div className="flex justify-between items-center mb-2">
         <h1 className="text-[24px] font-bold tracking-[-0.03em] text-foreground">Calendario</h1>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .rbc-calendar { font-family: inherit; border: none; }
        
        /* Hide default toolbar since we have a custom one */
        .rbc-toolbar { display: none !important; }
        
        /* Grid Layout (Framed Card) */
        .rbc-month-view { 
          background-color: var(--card); 
          border-radius: 16px; 
          box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); 
          border: 1px solid var(--border); 
          overflow: hidden; 
        }
        .rbc-header { padding: 12px 0; font-weight: 600; font-size: 12px; letter-spacing: 0.05em; color: var(--muted-foreground); text-transform: uppercase; border: none; }
        .rbc-header + .rbc-header { border: none; }
        /* Weekend logic: SÁB and DOM are columns 6 and 7 */
        .rbc-header:nth-child(6), .rbc-header:nth-child(7) { color: #E7000B; }
        .rbc-day-bg { border: none; }
        .rbc-day-bg + .rbc-day-bg { border-left: 1px solid var(--border); opacity: 0.6; }
        .rbc-month-row + .rbc-month-row { border-top: 1px solid var(--border); opacity: 0.6; }
        .rbc-date-cell { padding: 4px 8px; font-weight: 500; font-size: 14px; text-align: left; }
        
        /* Cells */
        .rbc-today-badge { 
          border-radius: 50%; 
          width: 32px; 
          height: 32px; 
          display: inline-flex !important; 
          align-items: center; 
          justify-content: center; 
          font-weight: 600;
        }
        .rbc-off-range-bg { background-color: transparent !important; }
        
        /* Events & Alignment fixes for Day/Week View */
        .rbc-event { padding: 4px 12px 4px 10px !important; transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1); box-sizing: border-box !important; border-radius: 9999px !important; border: none !important; box-shadow: inset 4px 0 0 0 var(--event-fg) !important; margin: 2px 4px !important; overflow: hidden; }
        .rbc-row-segment { padding: 0 4px; } /* Safely injects horizontal gap between events in month week rows without breaking RBC width math */
        .rbc-event:hover { transform: scale(1.01) translateY(-1px); z-index: 10; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .rbc-event-label { text-align: center; font-size: 11px; opacity: 0.8; margin-bottom: 2px; width: 100%; }
        .rbc-event-content { flex: 1 1 0%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; outline: none; font-weight: 500; font-size: 13px; text-align: center; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .rbc-event:focus { outline: 2px solid var(--ring); outline-offset: 2px; }
        .rbc-show-more { color: var(--muted-foreground) !important; font-weight: 500; font-size: 12px; margin-left: 4px; }
        
        /* Other Views (Week/Day) */
        .rbc-time-view, .rbc-agenda-view { border: none; background: transparent; }
        .rbc-time-header { border-bottom: none !important; margin-bottom: 0px; padding-top: 8px; padding-bottom: 4px; overflow: visible !important; min-height: 84px; } /* Fix: prevented top of header cards from being clipped */
        .rbc-time-header.rbc-overflowing { border-right: none !important; }
        .rbc-time-header-content { border-left: 1px solid transparent; border-right: none; overflow: visible !important; } /* Compensate for the 1px left border on .rbc-time-content to perfectly align headers with columns */
        .rbc-header { overflow: visible !important; border-bottom: none !important; padding-bottom: 4px; } /* CRITICAL: Prevents .rbc-header from slicing off the bottom loops of the day cards */
        .rbc-time-header-gutter { min-width: 72px !important; } /* MUST MATCH .rbc-time-gutter width EXACTLY */
        
        .rbc-time-content { 
          border-top: 1px solid var(--border) !important; 
          border-bottom: 1px solid var(--border) !important;
          border-left: 1px solid var(--border) !important;
          border-right: 1px solid var(--border) !important;
          border-radius: 16px; 
          box-sizing: border-box; 
          margin-top: 0px; 
          overflow-y: auto !important; 
          overflow-x: hidden !important; 
          background: var(--card); 
        }
        
        /* Dark gray minimalist scrollbar */
        .rbc-time-content::-webkit-scrollbar { width: 14px; }
        .rbc-time-content::-webkit-scrollbar-track { background: transparent; }
        .rbc-time-content::-webkit-scrollbar-thumb { background-color: #4b5563; border-radius: 9999px; border: 4px solid transparent; background-clip: padding-box; }
        .rbc-time-content::-webkit-scrollbar-thumb:hover { background-color: #374151; }
        
        .rbc-time-content > * { border-right: none !important; border-left: none !important; }
        .rbc-timeslot-group { border-bottom: none; min-height: 50px; }
        .rbc-timeslot-group:first-child .rbc-time-slot:first-child { border-top: none !important; } /* Fix: Remove top 00:00 boundary outline clash */
        .rbc-time-slot { border-color: transparent; }
        .rbc-time-gutter { border-right: 1px solid rgba(150, 150, 150, 0.1) !important; padding-left: 12px; min-width: 72px; padding-right: 6px; color: var(--muted-foreground); font-size: 12px; font-weight: 500; }
        .rbc-time-gutter .rbc-timeslot-group { border-bottom: none; }
        .rbc-time-gutter .rbc-time-slot { display: flex; align-items: center; justify-content: center; } /* Centers 00:00 perfectly in the middle of the hour block, avoiding the top border completely */
        .rbc-time-gutter .rbc-timeslot-group:first-child .rbc-time-slot:first-child span.rbc-label { transform: translateY(12px); } /* Forcing 00:00 downwards explicitly to visually clear the large outline curve */
        
        /* Horizontal lines: solid, ultra subtle, NO vertical lines */
        .rbc-day-slot .rbc-time-slot { border-top: 1px solid rgba(150, 150, 150, 0.08); } 
        
        /* Subtle Vertical Column Dividers */
        .rbc-time-content > * { border-left: none !important; border-right: none !important; }
        .rbc-day-slot { border-left: 1px solid rgba(150, 150, 150, 0.1) !important; border-right: none !important; } 
        .rbc-day-slot:first-of-type { border-left: none !important; } /* First column doesn't need left border as it's next to the time gutter */
        
        .rbc-allday-cell { height: 0; min-height: 0; overflow: hidden; border: none !important; opacity: 0; pointer-events: none; } /* hide all day cell in premium UI while keeping flexbox alive */
        .rbc-header.rbc-today { background-color: transparent !important; } /* Fix: Prevent gray bleed behind floating active card */
        .rbc-day-slot.rbc-today { background-color: color-mix(in srgb, var(--foreground) 5%, transparent) !important; } /* Uses alpha mix to avoid fading children */
        .is-day-view .rbc-day-slot.rbc-today { background-color: transparent !important; } /* Keep daily view white/pristine */
        .rbc-current-time-indicator { display: none !important; } /* User requested to remove the green current time line */
      `}} />
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
          onView={setView}
          date={date}
          onNavigate={setDate}
          culture="es"
          selectable={true}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={(event: any) => {
            const isDark = resolvedTheme === 'dark'
            
            // Premium pastel palettes inspired by UI reference (Darkened to Tailwind 300s for strong visibility)
            const pastels = [
              { lightBg: 'rgba(14, 165, 233, 0.2)', lightFg: '#0284c7', darkBg: 'rgba(14, 165, 233, 0.3)', darkFg: '#38bdf8' }, // Sky
              { lightBg: 'rgba(168, 85, 247, 0.2)', lightFg: '#7e22ce', darkBg: 'rgba(168, 85, 247, 0.3)', darkFg: '#c084fc' }, // Purple
              { lightBg: 'rgba(234, 179, 8, 0.2)', lightFg: '#a16207', darkBg: 'rgba(234, 179, 8, 0.3)', darkFg: '#facc15' }, // Yellow
              { lightBg: 'rgba(236, 72, 153, 0.2)', lightFg: '#be185d', darkBg: 'rgba(236, 72, 153, 0.3)', darkFg: '#f472b6' }, // Pink
              { lightBg: 'rgba(34, 197, 94, 0.2)', lightFg: '#15803d', darkBg: 'rgba(34, 197, 94, 0.3)', darkFg: '#4ade80' }, // Green
              { lightBg: 'rgba(249, 115, 22, 0.2)', lightFg: '#c2410c', darkBg: 'rgba(249, 115, 22, 0.3)', darkFg: '#fb923c' }, // Orange
            ];

            // Deterministic hash based on event ID/title to assign a stable pastel color
            const hashString = event.id || event.title || "";
            let hash = 0;
            for (let i = 0; i < hashString.length; i++) {
              hash = hashString.charCodeAt(i) + ((hash << 5) - hash);
            }
            const colorIndex = Math.abs(hash) % pastels.length;
            const assignedPastel = pastels[colorIndex];

            let bgColor = isDark ? assignedPastel.darkBg : assignedPastel.lightBg;
            let fgColor = isDark ? assignedPastel.darkFg : assignedPastel.lightFg;
            
            if (event.type === 'task') {
              const rawBg = event.resource?.color
              if (rawBg && rawBg !== 'ninguno') {
                // Exact matches for manual overrides (Mapped to darkened equivalents Tailwind 300)
                if (rawBg === '#ffedd5') { 
                   bgColor = isDark ? pastels[5].darkBg : pastels[5].lightBg; fgColor = isDark ? pastels[5].darkFg : pastels[5].lightFg;
                } else if (rawBg === '#fef9c3') { 
                   bgColor = isDark ? pastels[2].darkBg : pastels[2].lightBg; fgColor = isDark ? pastels[2].darkFg : pastels[2].lightFg;
                } else if (rawBg === '#dcfce7') { 
                   bgColor = isDark ? pastels[4].darkBg : pastels[4].lightBg; fgColor = isDark ? pastels[4].darkFg : pastels[4].lightFg;
                } else if (rawBg === '#dbeafe') { 
                   bgColor = isDark ? pastels[0].darkBg : pastels[0].lightBg; fgColor = isDark ? pastels[0].darkFg : pastels[0].lightFg;
                } else if (rawBg === '#f3e8ff') { 
                   bgColor = isDark ? pastels[1].darkBg : pastels[1].lightBg; fgColor = isDark ? pastels[1].darkFg : pastels[1].lightFg;
                } else if (rawBg === '#ffe4e6') { 
                   bgColor = isDark ? pastels[3].darkBg : pastels[3].lightBg; fgColor = isDark ? pastels[3].darkFg : pastels[3].lightFg;
                } else {
                   bgColor = rawBg;
                }
              }
            } else if (event.type === 'google') {
              bgColor = isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(224, 242, 254, 0.5)'
              fgColor = isDark ? '#bae6fd' : '#0369a1'
              // Google events get standard blue to differentiate from tasks initially
            } else if (event.type === 'reminder') {
               // Reminders use stable hash generated pastel color since they rarely have custom colors assigned
            }
            
            return {
              className: `event-${event.type} hover:opacity-90`,
              style: { 
                backgroundColor: bgColor, 
                color: fgColor,
                '--event-fg': fgColor, // Pass custom CSS var to pseudo element for the left accent stripe
                border: 'none', 
                borderRadius: '9999px',
                padding: '2px 8px', /* Reduced padding to fit more events */
                margin: '2px 4px', /* Symmetric horizontal margins to center pill in absolute column */
                outline: 'none',
                fontWeight: 600,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
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
            noEventsInRange: "No hay eventos ni tareas en este rango.",
          }}
        />
      
      <Dialog open={isReminderOpen} onOpenChange={setIsReminderOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Añadir Recordatorio</DialogTitle>
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
        reminder={reminders?.find((r: any) => r.id === selectedReminderId) || null} 
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
