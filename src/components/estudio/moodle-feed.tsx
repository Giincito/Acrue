import * as React from "react"
import { format, formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { motion } from "framer-motion"
import {
  BookOpen,
  CalendarClock,
  Check,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Folder,
  Loader2,
  MessageSquare,
  MessageSquarePlus,
  ShieldAlert,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { trpc } from "@/lib/trpc"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AiThinking } from "@/components/ui/ai-thinking"

interface MoodleEvent {
  id: string
  moodle_id: number
  parent_moodle_id: number | null
  course_name: string | null
  title: string
  type: string
  event_date: string | null
  is_completed: boolean
  ai_summary: string | null
  description: string | null
  url: string | null
  user_notes: string | null
}

interface TypeConfig {
  bg: string
  label: string
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case "assignment":
      return <CalendarClock className="w-4 h-4 text-accent" />
    case "quiz":
      return <ShieldAlert className="w-4 h-4 text-destructive" />
    case "forum":
      return <MessageSquare className="w-4 h-4 text-warning" />
    case "resource":
      return <FileText className="w-4 h-4 text-success" />
    default:
      return <BookOpen className="w-4 h-4 text-muted-foreground" />
  }
}

const getTypeConfig = (type: string): TypeConfig => {
  switch (type) {
    case "assignment":
      return { bg: "bg-accent/10 text-accent", label: "Tarea" }
    case "quiz":
      return { bg: "bg-destructive/10 text-destructive", label: "Examen" }
    case "forum":
      return { bg: "bg-warning/10 text-warning", label: "Aviso" }
    case "resource":
      return { bg: "bg-success/10 text-success", label: "Material" }
    default:
      return { bg: "bg-muted text-muted-foreground", label: "Otro" }
  }
}

export function MoodleFeed() {
  const { data: events, isLoading, refetch, isRefetching } = trpc.moodle.getEvents.useQuery()
  const eventRows = (events ?? []) as MoodleEvent[]
  const [summary, setSummary] = React.useState<string | null>(null)
  const [selectedCourse, setSelectedCourse] = React.useState<string | null>(null)
  const [editingNotesId, setEditingNotesId] = React.useState<string | null>(null)
  const [tempNote, setTempNote] = React.useState("")
  const [showCompleted, setShowCompleted] = React.useState(true)
  const [expandedFolders, setExpandedFolders] = React.useState<Set<number>>(new Set())

  const summaryMutation = trpc.moodle.getOverallSummary.useMutation({
    onSuccess: (data) => {
      if (data) setSummary(data)
      else toast.info("No hay eventos pendientes para resumir.")
    },
    onError: () => toast.error("Error al generar resumen."),
  })

  const updateMutation = trpc.moodle.updateEvent.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  const syncMutation = trpc.moodle.triggerSync.useMutation({
    onSuccess: () => {
      toast.success("Escaneo de Moodle completado")
      refetch()
    },
    onError: (error) => {
      toast.error(error.message || "Hubo un problema al escanear Moodle.")
    },
  })

  const toggleFolder = (moodleId: number) => {
    setExpandedFolders((current) => {
      const next = new Set(current)
      if (next.has(moodleId)) next.delete(moodleId)
      else next.add(moodleId)
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10 opacity-50">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  const courseNames = Array.from(
    new Set(eventRows.map((event) => event.course_name).filter((course): course is string => Boolean(course)))
  )
  const eventIds = new Set(eventRows.map((event) => event.moodle_id))
  const topLevel = eventRows.filter((event) => {
    const courseMatch = selectedCourse ? event.course_name === selectedCourse : true
    const statusMatch = showCompleted ? true : !event.is_completed
    const isActuallyTopLevel = !event.parent_moodle_id || !eventIds.has(event.parent_moodle_id)
    return courseMatch && statusMatch && isActuallyTopLevel
  })
  const childrenByParent = eventRows.reduce<Map<number, MoodleEvent[]>>((acc, event) => {
    if (event.parent_moodle_id && eventIds.has(event.parent_moodle_id)) {
      const statusMatch = showCompleted ? true : !event.is_completed
      if (!statusMatch) return acc

      const currentChildren = acc.get(event.parent_moodle_id) ?? []
      currentChildren.push(event)
      acc.set(event.parent_moodle_id, currentChildren)
    }
    return acc
  }, new Map())

  return (
    <div className="space-y-6 mt-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-medium">Actividad reciente</h3>
          <p className="text-sm text-muted-foreground">Extraído por el agente Moodle</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => summaryMutation.mutate()}
            disabled={summaryMutation.isPending || !eventRows.some((event) => !event.is_completed)}
            className="cursor-pointer gap-2 bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 text-accent-foreground border-none"
          >
            {summaryMutation.isPending ? <AiThinking text="" className="text-current" /> : <Sparkles className="w-4 h-4" />}
            <span className="hidden sm:inline">{summaryMutation.isPending ? "Resumiendo" : "Resumir pendientes"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCompleted((current) => !current)}
            className="cursor-pointer gap-2"
          >
            {showCompleted ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span className="hidden sm:inline">{showCompleted ? "Ocultar hechos" : "Ver hechos"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={syncMutation.isPending || isRefetching}
            onClick={() => syncMutation.mutate()}
            className="cursor-pointer gap-2"
          >
            {syncMutation.isPending || isRefetching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Escanear</span>
          </Button>
        </div>
      </div>

      {summaryMutation.isPending ? (
        <div className="flex bg-accent/5 border border-accent/20 rounded-xl p-4 gap-3">
          <AiThinking text="Procesando..." />
        </div>
      ) : summary ? (
        <div className="flex bg-accent/5 dark:bg-accent/10 border border-accent/20 rounded-xl p-4 gap-3 items-start relative overflow-hidden">
          <Sparkles className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-medium text-accent uppercase tracking-wider mb-1">Resumen inteligente</h4>
            <p className="text-sm font-medium text-foreground/90 leading-relaxed">{summary}</p>
          </div>
        </div>
      ) : null}

      {eventRows.length === 0 ? (
        <div className="text-center py-10 bg-muted/20 border border-dashed rounded-xl">
          <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No hay actividad reciente en Moodle.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 overflow-x-hidden pb-1">
            <Button
              variant={selectedCourse === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCourse(null)}
              className="rounded-full h-8 text-xs font-medium cursor-pointer"
            >
              Todas
            </Button>
            {courseNames.map((course) => (
              <Button
                key={course}
                variant={selectedCourse === course ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCourse(course)}
                className={`rounded-full h-8 max-w-full text-xs font-medium cursor-pointer ${
                  selectedCourse === course
                    ? "bg-stone-800 text-white hover:bg-stone-900 border-none dark:bg-stone-200 dark:text-black dark:hover:bg-stone-300"
                    : "bg-card/50"
                }`}
              >
                <span className="truncate">{course}</span>
              </Button>
            ))}
          </div>

          {topLevel.map((event, index) => {
            const children = childrenByParent.get(event.moodle_id) ?? []
            const isFolder = children.length > 0
            const typeConfig = getTypeConfig(event.type)
            const isDone = event.is_completed
            const isEditing = editingNotesId === event.id
            const isExpanded = expandedFolders.has(event.moodle_id)

            return (
              <div key={event.id} className="space-y-2">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`group flex gap-4 p-4 rounded-xl border transition-[background-color,border-color,box-shadow,filter,opacity] duration-150 ease-out motion-reduce:transition-none relative overflow-hidden ${
                    isDone
                      ? "bg-muted/10 opacity-60 grayscale-[0.3] hover:opacity-100"
                      : "bg-card/60 backdrop-blur-md hover:shadow-sm"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => updateMutation.mutate({ id: event.id, is_completed: !isDone })}
                    className={`mt-1 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${
                      isDone
                        ? "bg-success border-success text-success-foreground"
                        : "border-muted-foreground/30 hover:border-success/50 text-transparent hover:text-success/50"
                    }`}
                    aria-label={isDone ? "Marcar como pendiente" : "Marcar como hecho"}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <div className={`p-1.5 rounded-full ${typeConfig.bg}`}>
                        {isFolder ? <Folder className="w-4 h-4 text-warning" /> : getTypeIcon(event.type)}
                      </div>
                      <Badge variant="outline" className={`text-[10px] border-transparent font-medium px-2 py-0.5 rounded-md uppercase tracking-wider ${typeConfig.bg}`}>
                        {isFolder ? "Carpeta" : typeConfig.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                        {event.course_name}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60 ml-auto whitespace-nowrap">
                        {event.event_date ? formatDistanceToNow(new Date(event.event_date), { addSuffix: true, locale: es }) : ""}
                      </span>
                    </div>

                    <div className="flex justify-between items-start gap-2">
                      <h4 className={`text-base font-medium line-clamp-2 ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {event.title}
                      </h4>
                      {isFolder && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={isExpanded ? "Contraer carpeta de Moodle" : "Expandir carpeta de Moodle"}
                          className="h-8 w-8 shrink-0 rounded-full cursor-pointer"
                          onClick={(clickEvent) => {
                            clickEvent.stopPropagation()
                            toggleFolder(event.moodle_id)
                          }}
                        >
                          <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
                        </Button>
                      )}
                    </div>

                    {event.ai_summary && (
                      <div className="mt-2.5 mb-1 bg-accent/5 dark:bg-accent/10 border border-accent/10 dark:border-accent/20 rounded-lg p-3">
                        <div className="flex gap-2 items-start">
                          <Sparkles className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
                          <p className="text-sm text-foreground/90 leading-relaxed font-medium">
                            {event.ai_summary}
                          </p>
                        </div>
                      </div>
                    )}

                    {!event.ai_summary && event.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                    )}

                    {event.event_date && (event.type === "assignment" || event.type === "quiz") && (
                      <div className="text-xs font-medium text-accent pt-1">
                        Vence: {format(new Date(event.event_date), "EEEE d 'de' MMMM, HH:mm", { locale: es })}
                      </div>
                    )}

                    <div className="flex items-center gap-4 pt-2">
                      {event.url && event.type === "resource" && (
                        <a href={event.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs font-medium text-accent hover:underline">
                          Abrir {isFolder ? "Carpeta" : "link"} <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (isEditing) {
                            setEditingNotesId(null)
                          } else {
                            setTempNote(event.user_notes ?? "")
                            setEditingNotesId(event.id)
                          }
                        }}
                        className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        <MessageSquarePlus className="w-3 h-3 mr-1" />
                        {event.user_notes ? "Editar notas" : "Añadir notas"}
                      </button>
                    </div>

                    {event.user_notes && !isEditing && (
                      <div className="mt-2 text-sm bg-muted/30 p-2.5 rounded-lg border-l-2 border-accent text-foreground/80">
                        {event.user_notes}
                      </div>
                    )}

                    {isEditing && (
                      <div className="mt-3 flex flex-col gap-2">
                        <textarea
                          className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Escribe algo importante sobre esto..."
                          value={tempNote}
                          onChange={(changeEvent) => setTempNote(changeEvent.target.value)}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              updateMutation.mutate({ id: event.id, user_notes: tempNote })
                              setEditingNotesId(null)
                            }}
                            className="h-7 text-xs bg-accent text-accent-foreground hover:bg-accent/90"
                          >
                            Guardar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingNotesId(null)} className="h-7 text-xs">
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>

                {isFolder && isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="ml-8 pl-4 border-l-2 border-muted grid gap-3 pb-2"
                  >
                    {children.map((child) => (
                      <div
                        key={child.id}
                        className={`flex items-center justify-between p-3 rounded-lg border bg-card/40 backdrop-blur-sm ${child.is_completed ? "opacity-50 grayscale" : ""}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => updateMutation.mutate({ id: child.id, is_completed: !child.is_completed })}
                            aria-label={`${child.is_completed ? "Marcar como pendiente" : "Marcar como hecho"}: ${child.title}`}
                            aria-pressed={child.is_completed}
                            className="inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-muted/50"
                          >
                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                                child.is_completed ? "border-success bg-success text-success-foreground" : "border-muted-foreground/30 text-transparent"
                              }`}
                            >
                              <Check className="w-3 h-3" />
                            </span>
                          </button>
                          <div className="min-w-0">
                            <p className={`text-sm font-medium truncate ${child.is_completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                              {child.title}
                            </p>
                            <span className="text-[10px] text-muted-foreground/70">Archivo de carpeta</span>
                          </div>
                        </div>
                        {child.url && (
                          <a
                            href={child.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Descargar ${child.title}`}
                            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full p-2 transition-colors hover:bg-accent/10"
                          >
                            <Download className="w-4 h-4 text-accent" />
                          </a>
                        )}
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
