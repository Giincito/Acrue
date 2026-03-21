"use client"

import * as React from "react"
import { trpc } from "@/lib/trpc"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { format } from "date-fns"
import { es } from "date-fns/locale/es"
import { CalendarIcon, Palette, CheckCircle2, Circle, ListTodo, CircleDashed } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { TaskListView } from "@/components/tasks/task-list-view"

// Aesthetically pleasing colors aligned with Antigravity Premium
const PROJECT_COLORS = [
  { name: "Slate", value: "#64748b" },
  { name: "Mint", value: "#10b981" },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Emerald", value: "#059669" },
  { name: "Indigo", value: "#4f46e5" },
]

const ICONS = ["🚀", "💻", "📚", "🏠", "🌟", "💡", "💰", "🎨", "📈", "🎯", "⚡", "🔥", "✨", "🎉", "🏆", "🌿"]

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  color: string | null;
  icon: string | null;
  due_at: string | null;
  created_at: string;
}

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
  const [iconVal, setIconVal] = React.useState("")
  
  React.useEffect(() => {
    setOptimisticProject(initialProject)
    if (initialProject) {
      setName(initialProject.name || "")
      setDesc(initialProject.description || "")
      setIconVal(initialProject.icon || "")
    }
  }, [initialProject])

  const project = optimisticProject || initialProject;

  const handleUpdate = async (field: string, value: any) => {
    if (!project) return
    
    // Instant UI update
    setOptimisticProject(prev => prev ? { ...prev, [field]: value } : null)
    
    try {
      await updateMutation.mutateAsync({
        id: project.id,
        [field]: value
      })
      utils.projects.list.invalidate()
      utils.tasks.list.invalidate() // In case it affects task views
    } catch (e) {
      console.error(`Failed to update project ${field}`, e)
      setOptimisticProject(initialProject) // Revert on failure
    }
  }

  const handleTextBlur = (field: 'name' | 'description' | 'icon', value: string) => {
    if (project && project[field] !== value) {
      handleUpdate(field, value)
    }
  }

  const toggleStatus = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!project) return
    
    let newStatus: "planned" | "active" | "completed" = "active"
    if (project.status === "planned") newStatus = "active"
    else if (project.status === "active") newStatus = "completed"
    else if (project.status === "completed") newStatus = "planned"
    else newStatus = "planned"
    
    // Optimistic Update
    setOptimisticProject(prev => prev ? { ...prev, status: newStatus } : null)
    
    updateMutation.mutateAsync({
      id: project.id,
      status: newStatus,
    }).then(() => utils.projects.list.invalidate())
      .catch(() => setOptimisticProject(initialProject)) // Revert
  }

  if (!project) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md w-full overflow-y-auto border-l shadow-2xl bg-background/95 backdrop-blur-sm p-0">
        <SheetHeader className="px-6 py-4 border-b bg-card/50 sticky top-0 z-10 backdrop-blur-md">
          <SheetTitle className="sr-only">Detalles de Proyecto</SheetTitle>
          <SheetDescription className="sr-only">Edita los detalles, fechas y personalización de tu proyecto.</SheetDescription>
          
          <div className="flex items-center">
            <button 
              onClick={toggleStatus} 
              className="flex items-center gap-3 text-muted-foreground hover:text-accent transition-colors cursor-pointer group"
              title="Cambiar estado"
            >
              <div className="group-hover:scale-110 transition-transform">
                {project.status === "completed" ? (
                  <CheckCircle2 className="w-6 h-6 text-accent" />
                ) : project.status === "planned" ? (
                  <CircleDashed className="w-6 h-6" />
                ) : (
                  <Circle className="w-6 h-6" />
                )}
              </div>
              <p className="text-xs font-medium uppercase tracking-wider group-hover:text-accent transition-colors">
                 {project.status === "completed" ? "Completado" : project.status === "planned" ? "Planificado" : "En progreso"}
              </p>
            </button>
          </div>
        </SheetHeader>
        
        <div className="flex flex-col gap-6 p-6">
          {/* Header Editor: Icon + Name */}
          <div className="space-y-1 flex items-start gap-4">
             <div className="w-12 pt-1 shrink-0 flex justify-center">
                <Popover>
                  <PopoverTrigger disabled={project.status === "completed"} className="w-12 h-12 flex items-center justify-center text-3xl font-emoji rounded-xl hover:bg-muted/50 transition-colors disabled:opacity-70 disabled:hover:bg-transparent border border-transparent hover:border-border">
                    {iconVal || "🚀"}
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-3 shadow-xl rounded-xl" align="start">
                    <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Selecciona un ícono</p>
                    <div className="grid grid-cols-6 gap-1">
                       {ICONS.map(i => (
                         <button 
                           key={i} 
                           type="button"
                           className="text-2xl hover:bg-muted p-1 rounded-md transition-colors flex items-center justify-center font-emoji"
                           onClick={() => {
                             setIconVal(i)
                             handleUpdate('icon', i)
                           }}
                         >{i}</button>
                       ))}
                       <div className="col-span-6 mt-2 pt-2 border-t space-y-2">
                          <label className="text-xs font-medium px-1 block text-muted-foreground">O escribe tu Emoji</label>
                          <Input 
                            value={iconVal}
                            onChange={(e) => setIconVal(e.target.value)}
                            onBlur={() => handleTextBlur('icon', iconVal)}
                            maxLength={2}
                            placeholder="👽"
                            className="bg-muted/30 focus-visible:bg-transparent font-emoji text-lg h-9"
                          />
                       </div>
                    </div>
                  </PopoverContent>
                </Popover>
             </div>
            <Input 
              value={name}
              disabled={project.status === "completed"}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => handleTextBlur('name', name)}
              className={cn(
                "flex-1 text-2xl font-semibold border-0 px-0 rounded-none shadow-none focus-visible:ring-0 h-auto break-words disabled:opacity-100 disabled:cursor-text",
                project.status === "completed" && "line-through text-muted-foreground/60"
              )}
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
                     <PopoverTrigger disabled={project.status === "completed"} className="flex flex-row items-center gap-2 text-sm font-medium text-left w-full hover:underline px-1 py-0.5 rounded-sm disabled:hover:no-underline disabled:opacity-50 disabled:cursor-default outline-none focus-visible:ring-2 focus-visible:ring-accent">
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
                              "w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 border border-black/10 dark:border-white/10",
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
                  <PopoverTrigger disabled={project.status === "completed"} className="text-sm font-medium text-left w-full hover:underline px-1 py-0.5 rounded-sm disabled:hover:no-underline disabled:opacity-50 disabled:cursor-default outline-none focus-visible:ring-2 focus-visible:ring-accent">
                      {project.due_at ? format(new Date(project.due_at), "PPP", { locale: es }) : <span className="text-muted-foreground">Sin fecha objetivo</span>}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={project.due_at ? new Date(project.due_at) : undefined}
                      onSelect={(date) => {
                          const dateStr = date ? date.toISOString() : null;
                          handleUpdate('due_at', dateStr);
                          // Do not close popover automatically, but allow user to select Date
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
            <h3 className="text-sm font-medium text-muted-foreground px-1 mb-1">Notas del Proyecto</h3>
            <Textarea 
              value={desc}
              disabled={project.status === "completed"}
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
              <h3 className="text-sm font-medium">Tareas del Proyecto</h3>
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
