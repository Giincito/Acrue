"use client"

import * as React from "react"
import { useTaskStore, Task } from "@/store/useTaskStore"
import { trpc } from "@/lib/trpc"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { format, isValid } from "date-fns"
import { es } from "date-fns/locale/es"
import { CalendarIcon, Tag, FolderKanban, Flag, Circle, CheckCircle2, PaintBucket, BookOpen, Clock, Trash2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { IconPicker } from "@/components/ui/icon-picker"
import { GenericColorLabel, GenericColorSelectItems } from "@/components/shared/generic-color-select"
import { cn } from "@/lib/utils"
import type { UpdateTaskInput } from "@/server/schema/task"
import { toast } from "sonner"

interface TaskDetailsDrawerProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

type TaskUpdate = Partial<
  Pick<
    UpdateTaskInput,
    | "title"
    | "description"
    | "icon"
    | "project_id"
    | "due_at"
    | "start_time"
    | "end_time"
    | "is_all_day"
    | "context_tag"
    | "university_type"
    | "priority"
    | "color"
  >
>

const DETAIL_TITLE_INPUT_CLASS =
  "min-h-11 w-full rounded-xl border-0 bg-transparent px-3 py-2 text-2xl font-medium shadow-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-text disabled:bg-muted/40 disabled:opacity-100"

const DETAIL_SELECT_TRIGGER_CLASS =
  "h-11 min-h-11 w-full justify-between rounded-lg border-0 bg-muted/35 px-3 py-2 text-sm font-medium shadow-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"

const DETAIL_DATE_TRIGGER_CLASS =
  "flex min-h-11 w-full items-center rounded-lg bg-muted/35 px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 cursor-pointer"

const DETAIL_TIME_INPUT_CLASS =
  "h-11 min-h-11 rounded-lg border-0 bg-muted/35 px-3 py-2 text-sm font-medium shadow-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"

const DETAIL_FIELD_LABEL_CLASS =
  "px-1 text-[10px] font-medium uppercase text-muted-foreground"

export function TaskDetailsDrawer({ task: initialTask, open, onOpenChange }: TaskDetailsDrawerProps) {
  const { updateTask, removeTask } = useTaskStore()
  const updateMutation = trpc.tasks.update.useMutation()
  const deleteMutation = trpc.tasks.delete.useMutation()
  const utils = trpc.useUtils()
  const { data: projects } = trpc.projects.list.useQuery()

  const [optimisticTask, setOptimisticTask] = React.useState<Task | null>(null)
  const [title, setTitle] = React.useState("")
  const [desc, setDesc] = React.useState("")
  const [startTime, setStartTime] = React.useState("")
  const [endTime, setEndTime] = React.useState("")

  React.useEffect(() => {
    setOptimisticTask(initialTask)
    if (initialTask) {
      setTitle(initialTask.title || "")
      setDesc(initialTask.description || "")
      setStartTime(initialTask.start_time || "")
      setEndTime(initialTask.end_time || "")
    }
  }, [initialTask])

  const task = optimisticTask || initialTask;

  const handleUpdate = async <K extends keyof TaskUpdate>(field: K, value: TaskUpdate[K]) => {
    if (!task) return
    const updates = { [field]: value } as TaskUpdate

    // Instant UI update
    setOptimisticTask(prev => prev ? { ...prev, ...updates } : null)
    // Synchronize global optimistics
    updateTask(task.id, updates)

    // Optimistically update the TRPC cache so the Calendar immediately reflects the change
    utils.tasks.list.setData(undefined, (old) => {
      if (!old) return old;
      return old.map(t => t.id === task.id ? { ...t, ...updates } : t);
    });

    try {
      await updateMutation.mutateAsync({
        id: task.id,
        ...updates
      })
      utils.tasks.list.invalidate()
    } catch {
      setOptimisticTask(initialTask) // Revert on error
      utils.tasks.list.invalidate()
      toast.error("No se pudo actualizar la tarea")
    }
  }

  const handleTextBlur = (field: 'title' | 'description', value: string) => {
    if (task && task[field] !== value) {
      handleUpdate(field, value)
    }
  }

  const handleTimeBlur = (field: 'start_time' | 'end_time', value: string) => {
    const finalValue = value === "" ? null : value;
    if (task && task[field] !== finalValue) {
      handleUpdate(field, finalValue)

      // Auto-toggle is_all_day based on having a start time
      if (field === 'start_time') {
         const newIsAllDay = !finalValue;
         if (task.is_all_day !== newIsAllDay) {
            handleUpdate('is_all_day', newIsAllDay);
         }
      }
    }
  }

  const toggleStatus = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!task) return
    const isCompleted = task.status === "completed"
    const newStatus = isCompleted ? "inbox" : "completed"
    const newCompletedAt = isCompleted ? null : new Date().toISOString()

    setOptimisticTask(prev => prev ? { ...prev, status: newStatus, completed_at: newCompletedAt } : null)
    updateTask(task.id, {
      status: newStatus,
      completed_at: newCompletedAt
    })

    updateMutation.mutateAsync({
      id: task.id,
      status: newStatus,
      completed_at: newCompletedAt
    }).then(() => {
      utils.tasks.list.invalidate()
    }).catch(() => {
      setOptimisticTask(initialTask) // Revert
      utils.tasks.list.invalidate()
      toast.error("No se pudo cambiar el estado")
    })
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!task) return;

    // Optimistic UI updates
    removeTask(task.id);
    setOptimisticTask(prev => prev ? { ...prev, status: "trash" } : null);

    // Optimistic TRPC update: Remove from list entirely since most views filter out deleted/trash
    utils.tasks.list.setData(undefined, (old) => {
      if (!old) return old;
      return old.filter(t => t.id !== task.id);
    });

    onOpenChange(false);

    try {
      await deleteMutation.mutateAsync({
        id: task.id
      });
      utils.tasks.list.invalidate();
    } catch {
      utils.tasks.list.invalidate();
      toast.error("No se pudo mover la tarea a la papelera");
    }
  };

  if (!task) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md w-full overflow-y-auto border-l shadow-2xl bg-background/95 backdrop-blur-sm p-0">
        <SheetHeader className="px-6 py-4 border-b bg-card/50 sticky top-0 z-10 backdrop-blur-md">
          <SheetTitle className="sr-only">Detalles de Tarea</SheetTitle>
          <SheetDescription className="sr-only">Edita los detalles, proyecto y etiquetas de tu tarea.</SheetDescription>

          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={toggleStatus}
              className="flex items-center gap-3 text-muted-foreground hover:text-accent transition-colors cursor-pointer group"
              title="Cambiar estado"
            >
              <div className="group-hover:scale-110 transition-transform">
                {task.status === "completed" ? (
                  <CheckCircle2 className="w-6 h-6 text-accent" />
                ) : (
                  <Circle className="w-6 h-6" />
                )}
              </div>
              <p className="text-xs font-medium uppercase tracking-wider group-hover:text-accent transition-colors">
                 {task.status === "completed" ? "Completada" : "En progreso"}
              </p>
            </button>

            <button
              type="button"
              onClick={handleDelete}
              aria-label={`Mover ${task.title} a papelera`}
              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-[background-color,color,transform] duration-150 ease-out group active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 cursor-pointer"
              title="Mover a papelera"
            >
              <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-6 p-6">
          {/* Title Editor */}
          <div className="flex items-center gap-3">
            <IconPicker
              value={task.icon}
              onChange={(v) => handleUpdate('icon', v)}
              disabled={task.status === "completed"}
            />
            <Input
              value={title}
              disabled={task.status === "completed"}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => handleTextBlur('title', title)}
              className={cn(
                DETAIL_TITLE_INPUT_CLASS,
                task.status === "completed" && "line-through text-muted-foreground/60"
              )}
              placeholder="Título de la tarea"
            />
          </div>

          {/* Attributes Grid */}
          <div className="flex flex-col gap-0 rounded-xl border bg-card overflow-hidden [&>div:last-child]:border-0">

            {/* Project */}
            <div className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors border-b">
              <FolderKanban className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <Select
                  value={task.project_id || "ninguno"}
                  onValueChange={(v) => handleUpdate('project_id', v === "ninguno" ? null : v)}
                  disabled={task.status === "completed"}
                >
                  <SelectTrigger className={DETAIL_SELECT_TRIGGER_CLASS}>
                    <SelectValue placeholder="Bandeja (Sin proyecto)">
                      {task.project_id && projects?.find(p => p.id === task.project_id) ? (
                        <div className="flex items-center gap-2">
                          {projects.find(p => p.id === task.project_id)?.icon ?
                            <span>{projects.find(p => p.id === task.project_id)?.icon}</span> :
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: projects.find(p => p.id === task.project_id)?.color || "var(--accent)" }} />
                          }
                          <span>{projects.find(p => p.id === task.project_id)?.name}</span>
                        </div>
                      ) : (
                         task.project_id && task.project_id !== "ninguno" ? "Cargando proyecto..." : "Bandeja (Sin proyecto)"
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ninguno" className="text-muted-foreground">Bandeja (Sin proyecto)</SelectItem>
                    {projects?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          {p.icon ? <span>{p.icon}</span> : <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || "var(--accent)" }} />}
                          <span>{p.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Due Date */}
            <div className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors border-b">
              <CalendarIcon className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <Popover>
                  <PopoverTrigger disabled={task.status === "completed"} className={DETAIL_DATE_TRIGGER_CLASS}>
                    {task.due_at && isValid(new Date(task.due_at)) ? format(new Date(task.due_at), "PPP", { locale: es }) : <span className="text-muted-foreground">Sin fecha objetivo</span>}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={task.due_at ? new Date(task.due_at) : undefined}
                      onSelect={(date) => handleUpdate('due_at', date ? date.toISOString() : null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Time Grid */}
            <div className="flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors border-b">
              <div className="mt-7 w-4 h-4 text-muted-foreground shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0 grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className={DETAIL_FIELD_LABEL_CLASS}>Hora inicio</span>
                  <Input
                     type="time"
                     disabled={task.status === "completed"}
                     value={startTime}
                     onChange={e => setStartTime(e.target.value)}
                     onBlur={() => handleTimeBlur('start_time', startTime)}
                     className={cn(DETAIL_TIME_INPUT_CLASS, !startTime && "text-muted-foreground")}
                  />
                </div>
                <div className="space-y-1">
                  <span className={DETAIL_FIELD_LABEL_CLASS}>Hora fin</span>
                  <Input
                     type="time"
                     disabled={task.status === "completed"}
                     value={endTime}
                     onChange={e => setEndTime(e.target.value)}
                     onBlur={() => handleTimeBlur('end_time', endTime)}
                     className={cn(DETAIL_TIME_INPUT_CLASS, !endTime && "text-muted-foreground")}
                  />
                </div>
              </div>
            </div>

            {/* Context/Tag */}
            <div className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors border-b">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <Select
                  value={task.context_tag || "ninguno"}
                  onValueChange={(v) => handleUpdate('context_tag', v === "ninguno" ? null : v)}
                  disabled={task.status === "completed"}
                >
                  <SelectTrigger className={DETAIL_SELECT_TRIGGER_CLASS}>
                    <SelectValue placeholder="Sin contexto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ninguno" className="text-muted-foreground">Sin contexto</SelectItem>
                    <SelectItem value="@hogar">@hogar</SelectItem>
                    <SelectItem value="@universidad">@universidad</SelectItem>
                    <SelectItem value="@personal">@personal</SelectItem>
                    <SelectItem value="@compras">@compras</SelectItem>
                    <SelectItem value="@trabajo">@trabajo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Conditional University Type */}
            {task.context_tag === "@universidad" && (
              <div className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors border-b">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <Select
                    value={task.university_type || "ninguno"}
                    onValueChange={(v) => handleUpdate('university_type', v === "ninguno" ? null : v)}
                    disabled={task.status === "completed"}
                  >
                    <SelectTrigger className={DETAIL_SELECT_TRIGGER_CLASS}>
                      <SelectValue placeholder="Tipo de asunto universitario" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ninguno">Sin especificar</SelectItem>
                      <SelectItem value="examen">Examen</SelectItem>
                      <SelectItem value="tarea">Tarea práctica</SelectItem>
                      <SelectItem value="estudio">Estudio / repaso</SelectItem>
                      <SelectItem value="lectura">Lectura obligatoria</SelectItem>
                      <SelectItem value="compra">Compra de materiales</SelectItem>
                      <SelectItem value="tramite">Trámite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Priority */}
            <div className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors border-b">
              <Flag className={cn("w-4 h-4", task.priority === 1 ? "text-destructive" : task.priority === 2 ? "text-warning" : "text-accent")} />
              <div className="flex-1 min-w-0">
                <Select
                  value={task.priority.toString()}
                  onValueChange={(v) => handleUpdate('priority', v ? parseInt(v, 10) : 2)}
                  disabled={task.status === "completed"}
                >
                  <SelectTrigger className={DETAIL_SELECT_TRIGGER_CLASS}>
                    <SelectValue placeholder="Prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Alta (1)</SelectItem>
                    <SelectItem value="2">Media (2)</SelectItem>
                    <SelectItem value="3">Baja (3)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Color */}
             <div className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors">
               <PaintBucket className="w-4 h-4 text-muted-foreground" />
               <div className="flex-1 min-w-0">
                 <Select
                   value={task.color || "ninguno"}
                   onValueChange={(v) => handleUpdate('color', v === "ninguno" ? null : v)}
                   disabled={task.status === "completed"}
                 >
                   <SelectTrigger className={DETAIL_SELECT_TRIGGER_CLASS}>
                     <SelectValue placeholder="Automático">
                       {(!task.color || task.color === "ninguno") && <span className="text-muted-foreground">Automático (según prioridad)</span>}
                       {task.color && task.color !== "ninguno" && <GenericColorLabel value={task.color} swatchClassName="h-3 w-3" />}
                     </SelectValue>
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="ninguno"><span className="text-muted-foreground">Automático (según prioridad)</span></SelectItem>
                     <GenericColorSelectItems swatchClassName="h-3 w-3" />
                   </SelectContent>
                 </Select>
               </div>
             </div>

          </div>

          {/* Description Editor */}
          <div className="space-y-2 pt-2">
            <h3 className="text-sm font-medium text-muted-foreground px-1 mb-1">Notas y descripción</h3>
            <Textarea
              value={desc}
              disabled={task.status === "completed"}
              onChange={(e) => setDesc(e.target.value)}
              onBlur={() => handleTextBlur('description', desc)}
              className="min-h-[250px] resize-none border px-4 py-3 bg-muted/20 focus-visible:bg-transparent text-sm shadow-sm transition-colors rounded-xl disabled:opacity-70 disabled:cursor-text"
              placeholder="¿Qué necesitás recordar de esto? Escribí tus notas aquí..."
            />
          </div>

        </div>
      </SheetContent>
    </Sheet>
  )
}
