"use client"

import * as React from "react"
import { trpc } from "@/lib/trpc"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { format } from "date-fns"
import { es } from "date-fns/locale/es"
import { CalendarIcon, Palette, CheckCircle2, Circle, ListTodo, CircleDashed, Pause, Archive } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { TaskListView } from "@/components/tasks/task-list-view"
import { IconPicker } from "@/components/ui/icon-picker"
import type { ProjectStatus, UpdateProjectInput } from "@/server/schema/project"
import { toast } from "sonner"

const PROJECT_COLORS = [
  { name: "Acento", value: "#2282fa" },
  { name: "Core", value: "#0C0C0B" },
  { name: "Slate", value: "#3C3C3A" },
  { name: "Stone", value: "#888884" },
  { name: "Ash", value: "#C8C8C2" },
  { name: "Linen", value: "#EAEAE6" },
]

/** All project states in cycle order. */
const STATUS_CYCLE: ProjectStatus[] = ["planned", "active", "paused", "completed", "archived"]

/** Visual mapping for each status. */
function statusConfig(status: ProjectStatus) {
  switch (status) {
    case 'completed':
      return { icon: CheckCircle2, label: 'Completado', color: 'text-success' }
    case 'paused':
      return { icon: Pause, label: 'Pausado', color: 'text-stone-500' }
    case 'planned':
      return { icon: CircleDashed, label: 'Planificado', color: 'text-accent' }
    case 'archived':
      return { icon: Archive, label: 'Archivado', color: 'text-muted-foreground' }
    case 'active':
    default:
      return { icon: Circle, label: 'En progreso', color: 'text-accent' }
  }
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  color: string | null;
  icon: string | null;
  due_at: string | null;
  created_at: string;
}

type ProjectUpdate = Partial<Omit<UpdateProjectInput, "id">>

interface ProjectDetailsDrawerProps {
  project: Project | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProjectDetailsDrawer({ project: initialProject, open, onOpenChange }: ProjectDetailsDrawerProps) {
  const updateMutation = trpc.projects.update.useMutation()
  const utils = trpc.useUtils()

  const [optimisticProject, setOptimisticProject] = React.useState<Project | null>(null)
  const [name, setName] = React.useState("")
  const [desc, setDesc] = React.useState("")
  const [showStatusPicker, setShowStatusPicker] = React.useState(false)

  React.useEffect(() => {
    setOptimisticProject(initialProject)
    if (initialProject) {
      setName(initialProject.name || "")
      setDesc(initialProject.description || "")
    }
  }, [initialProject])

  const project = optimisticProject || initialProject;

  const handleUpdate = async <K extends keyof ProjectUpdate>(field: K, value: ProjectUpdate[K]) => {
    if (!project) return
    const updates = { [field]: value } as ProjectUpdate

    setOptimisticProject(prev => prev ? { ...prev, ...updates } : null)

    try {
      await updateMutation.mutateAsync({
        id: project.id,
        ...updates
      })
      utils.projects.list.invalidate()
      utils.tasks.list.invalidate()
    } catch {
      setOptimisticProject(initialProject)
      toast.error("No se pudo actualizar el proyecto")
    }
  }

  const handleTextBlur = (field: 'name' | 'description', value: string) => {
    if (project && project[field] !== value) {
      handleUpdate(field, value)
    }
  }

  const handleStatusChange = (newStatus: ProjectStatus) => {
    if (!project || project.status === newStatus) return
    setOptimisticProject(prev => prev ? { ...prev, status: newStatus } : null)
    setShowStatusPicker(false)

    updateMutation.mutateAsync({
      id: project.id,
      status: newStatus,
    }).then(() => utils.projects.list.invalidate())
      .catch(() => {
        setOptimisticProject(initialProject)
        toast.error("No se pudo actualizar el estado")
      })
  }

  if (!project) return null

  const currentStatus = (project.status || 'active') as ProjectStatus
  const cfg = statusConfig(currentStatus)
  const StatusIcon = cfg.icon

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md w-full overflow-y-auto border-l shadow-2xl bg-background/95 backdrop-blur-sm p-0">
        <SheetHeader className="px-6 py-4 border-b bg-card/50 sticky top-0 z-10 backdrop-blur-md">
          <SheetTitle className="sr-only">Detalles del proyecto</SheetTitle>
          <SheetDescription className="sr-only">Edita los detalles, fechas y personalización de tu proyecto.</SheetDescription>

          {/* Status Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowStatusPicker(!showStatusPicker)}
              aria-label={`Cambiar estado del proyecto: ${cfg.label}`}
              className="flex items-center gap-3 text-muted-foreground hover:text-accent transition-colors cursor-pointer group"
              title="Cambiar estado"
            >
              <div className="group-hover:scale-110 transition-transform">
                <StatusIcon className={cn("w-6 h-6", cfg.color)} />
              </div>
              <p className={cn("text-xs font-medium uppercase tracking-wider transition-colors", cfg.color)}>
                {cfg.label}
              </p>
            </button>

            {/* Status dropdown */}
            {showStatusPicker && (
              <div className="absolute top-full left-0 mt-2 bg-popover border rounded-lg shadow-lg z-50 py-1 min-w-[180px]">
                {STATUS_CYCLE.map((s) => {
                  const c = statusConfig(s)
                  const Icon = c.icon
                  return (
                    <button
                      type="button"
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      aria-label={`Seleccionar estado ${c.label}`}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors cursor-pointer",
                        s === currentStatus
                          ? "bg-accent/10 font-medium"
                          : "hover:bg-muted/70"
                      )}
                    >
                      <Icon className={cn("w-4 h-4", c.color)} />
                      <span>{c.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-6 p-6">
          {/* Header Editor: Icon + Name */}
          <div className="space-y-1 flex items-center gap-4">
             <div className="pt-1 shrink-0 flex justify-center">
                 <IconPicker
                   value={project.icon}
                   onChange={(v) => handleUpdate('icon', v)}
                   disabled={currentStatus === "archived"}
                 />
             </div>
            <Input
              value={name}
              disabled={currentStatus === "archived"}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => handleTextBlur('name', name)}
              className={cn(
                "flex-1 text-2xl font-medium border-0 px-0 rounded-none shadow-none focus-visible:ring-0 h-auto break-words disabled:opacity-100 disabled:cursor-text",
                currentStatus === "completed" && "line-through text-muted-foreground/60"
              )}
              style={{ fontWeight: 500 }}
              placeholder="Nombre del proyecto"
            />
          </div>

          {/* Attributes Grid */}
          <div className="flex flex-col gap-0 rounded-xl border bg-card overflow-hidden [&>div:last-child]:border-0">

            {/* Color Palette */}
             <div className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors border-b">
              <Palette className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1">
                 <Popover>
                     <PopoverTrigger disabled={currentStatus === "archived"} className="flex flex-row items-center gap-2 text-sm font-medium text-left w-full hover:underline px-1 py-0.5 rounded-sm disabled:hover:no-underline disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer">
                        <div className="w-3 h-3 rounded-full border border-black/10 dark:border-white/10" style={{ backgroundColor: project.color || 'var(--accent)' }} />
                        <span>Color de acento</span>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3" align="start">
                      <div className="grid grid-cols-4 gap-2">
                        {PROJECT_COLORS.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => {
                              handleUpdate('color', c.value)
                            }}
                            className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 border border-black/10 dark:border-white/10 cursor-pointer",
                              project.color === c.value && "ring-2 ring-offset-2 ring-primary"
                            )}
                            style={{ backgroundColor: c.value }}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
              </div>
            </div>

            {/* Due Date */}
            <div className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors border-b">
              <CalendarIcon className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1">
                <Popover>
                  <PopoverTrigger disabled={currentStatus === "archived"} className="text-sm font-medium text-left w-full hover:underline px-1 py-0.5 rounded-sm disabled:hover:no-underline disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer">
                      {project.due_at ? format(new Date(project.due_at), "PPP", { locale: es }) : <span className="text-muted-foreground">Sin fecha objetivo</span>}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={project.due_at ? new Date(project.due_at) : undefined}
                      onSelect={(date) => {
                          const dateStr = date ? date.toISOString() : null;
                          handleUpdate('due_at', dateStr);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

          </div>

          {/* Description Editor */}
          <div className="space-y-2 pt-2">
            <h3 className="text-sm font-medium text-muted-foreground px-1 mb-1">Notas del proyecto</h3>
            <Textarea
              value={desc}
              disabled={currentStatus === "archived"}
              onChange={(e) => setDesc(e.target.value)}
              onBlur={() => handleTextBlur('description', desc)}
              className="resize-none border px-4 py-3 bg-muted/20 focus-visible:bg-transparent text-sm shadow-sm transition-colors rounded-xl disabled:opacity-70 disabled:cursor-text h-40"
              placeholder="¿Qué objetivo tiene este proyecto? Escribe tus notas, links o referencias aquí..."
            />
          </div>

          {/* Project Tasks */}
          <div className="space-y-3 pt-6 border-t mt-2">
            <div className="flex items-center gap-2 px-1">
              <ListTodo className="w-5 h-5 text-accent" />
              <h3 className="text-sm font-medium">Tareas del proyecto</h3>
            </div>
            <div className="bg-muted/10 p-2 rounded-xl border border-dashed">
              <TaskListView status="all" projectId={project.id} emptyText="No hay tareas en este proyecto aún." />
            </div>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  )
}
