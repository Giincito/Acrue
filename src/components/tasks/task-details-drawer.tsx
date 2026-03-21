"use client"

import * as React from "react"
import { useTaskStore, Task } from "@/store/useTaskStore"
import { trpc } from "@/lib/trpc"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { format, isValid } from "date-fns"
import { es } from "date-fns/locale/es"
import { CalendarIcon, Tag, FolderKanban, Flag, Circle, CheckCircle2, PaintBucket, BookOpen } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

interface TaskDetailsDrawerProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TaskDetailsDrawer({ task: initialTask, open, onOpenChange }: TaskDetailsDrawerProps) {
  const { updateTask } = useTaskStore()
  const updateMutation = trpc.tasks.update.useMutation()
  const utils = trpc.useUtils()
  const { data: projects } = trpc.projects.list.useQuery()
  
  const [optimisticTask, setOptimisticTask] = React.useState<Task | null>(null)
  const [title, setTitle] = React.useState("")
  const [desc, setDesc] = React.useState("")
  
  React.useEffect(() => {
    setOptimisticTask(initialTask)
    if (initialTask) {
      setTitle(initialTask.title || "")
      setDesc(initialTask.description || "")
    }
  }, [initialTask])

  const task = optimisticTask || initialTask;

  const handleUpdate = async (field: string, value: any) => {
    if (!task) return
    
    // Instant UI update
    setOptimisticTask(prev => prev ? { ...prev, [field]: value } : null)
    // Synchronize global optimistics
    updateTask(task.id, { [field]: value })
    
    try {
      await updateMutation.mutateAsync({
        id: task.id,
        [field]: value
      })
      utils.tasks.list.invalidate()
    } catch (e) {
      console.error(`Failed to update task ${field}`, e)
      setOptimisticTask(initialTask) // Revert on error
    }
  }

  const handleTextBlur = (field: 'title' | 'description', value: string) => {
    if (task && task[field] !== value) {
      handleUpdate(field, value)
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
    })
  }

  if (!task) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md w-full overflow-y-auto border-l shadow-2xl bg-background/95 backdrop-blur-sm p-0">
        <SheetHeader className="px-6 py-4 border-b bg-card/50 sticky top-0 z-10 backdrop-blur-md">
          <SheetTitle className="sr-only">Detalles de Tarea</SheetTitle>
          <SheetDescription className="sr-only">Edita los detalles, proyecto y etiquetas de tu tarea.</SheetDescription>
          
          <div className="flex items-center">
            <button 
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
          </div>
        </SheetHeader>
        
        <div className="flex flex-col gap-6 p-6">
          {/* Title Editor */}
          <div className="space-y-1">
            <Input 
              value={title}
              disabled={task.status === "completed"}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => handleTextBlur('title', title)}
              className={cn(
                "text-2xl font-semibold border-0 px-0 rounded-none shadow-none focus-visible:ring-0 h-auto break-words disabled:opacity-100 disabled:cursor-text",
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
              <div className="flex-1">
                <Select 
                  value={task.project_id || "ninguno"} 
                  onValueChange={(v) => handleUpdate('project_id', v === "ninguno" ? null : v)}
                  disabled={task.status === "completed"}
                >
                  <SelectTrigger className="h-auto py-0 px-1 border-0 shadow-none focus-visible:ring-0 bg-transparent text-sm font-medium w-full justify-start gap-2 hover:bg-transparent -ml-1 disabled:opacity-50">
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
              <div className="flex-1">
                <Popover>
                  <PopoverTrigger disabled={task.status === "completed"} className="text-sm font-medium text-left w-full hover:underline px-1 py-0.5 rounded-sm disabled:hover:no-underline disabled:opacity-50 disabled:cursor-default focus-visible:outline-none focus:ring-2 focus:ring-accent">
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

            {/* Context/Tag */}
            <div className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors border-b">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1">
                <Select 
                  value={task.context_tag || "ninguno"} 
                  onValueChange={(v) => handleUpdate('context_tag', v === "ninguno" ? null : v)}
                  disabled={task.status === "completed"}
                >
                  <SelectTrigger className="h-auto py-0 px-1 border-0 shadow-none focus-visible:ring-0 bg-transparent text-sm font-medium w-full justify-start gap-2 hover:bg-transparent -ml-1 disabled:opacity-50">
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
                <div className="flex-1">
                  <Select 
                    value={task.university_type || "ninguno"} 
                    onValueChange={(v) => handleUpdate('university_type', v === "ninguno" ? null : v)}
                    disabled={task.status === "completed"}
                  >
                    <SelectTrigger className="h-auto py-0 px-1 border-0 shadow-none focus-visible:ring-0 bg-transparent text-sm font-medium w-full justify-start gap-2 hover:bg-transparent -ml-1 disabled:opacity-50">
                      <SelectValue placeholder="Tipo de asunto universitario" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ninguno">Sin especificar</SelectItem>
                      <SelectItem value="examen">Examen</SelectItem>
                      <SelectItem value="tarea">Tarea Práctica</SelectItem>
                      <SelectItem value="estudio">Estudio / Repaso</SelectItem>
                      <SelectItem value="lectura">Lectura Obligatoria</SelectItem>
                      <SelectItem value="compra">Compra de materiales</SelectItem>
                      <SelectItem value="tramite">Trámite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Priority */}
            <div className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors border-b">
              <Flag className={cn("w-4 h-4", task.priority === 1 ? "text-red-500" : task.priority === 2 ? "text-yellow-500" : "text-blue-500")} />
              <div className="flex-1">
                <Select 
                  value={task.priority.toString()} 
                  onValueChange={(v) => handleUpdate('priority', v ? parseInt(v, 10) : 2)}
                  disabled={task.status === "completed"}
                >
                  <SelectTrigger className="h-auto py-0 px-1 border-0 shadow-none focus-visible:ring-0 bg-transparent text-sm font-medium w-full justify-start gap-2 hover:bg-transparent -ml-1 disabled:opacity-50">
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
               <div className="flex-1">
                 <Select 
                   value={task.color || "ninguno"} 
                   onValueChange={(v) => handleUpdate('color', v === "ninguno" ? null : v)}
                   disabled={task.status === "completed"}
                 >
                   <SelectTrigger className="h-auto py-0 px-1 border-0 shadow-none focus-visible:ring-0 bg-transparent text-sm font-medium w-full justify-start gap-2 hover:bg-transparent -ml-1 disabled:opacity-50">
                     <SelectValue placeholder="Automático">
                       {task.color === "#ffedd5" && <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ffedd5]" /> Naranja</span>}
                       {task.color === "#fef9c3" && <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#fef9c3]" /> Amarillo</span>}
                       {task.color === "#dcfce7" && <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#dcfce7]" /> Verde</span>}
                       {task.color === "#dbeafe" && <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#dbeafe]" /> Azul</span>}
                       {task.color === "#f3e8ff" && <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#f3e8ff]" /> Púrpura</span>}
                       {task.color === "#ffe4e6" && <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ffe4e6]" /> Rosa</span>}
                       {(!task.color || task.color === "ninguno") && <span className="text-muted-foreground">Automático (Según Prioridad)</span>}
                     </SelectValue>
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="ninguno"><span className="text-muted-foreground">Automático (Según Prioridad)</span></SelectItem>
                     <SelectItem value="#ffedd5"><span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ffedd5] border border-[#f97316]" /> Naranja</span></SelectItem>
                     <SelectItem value="#fef9c3"><span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#fef9c3] border border-[#eab308]" /> Amarillo</span></SelectItem>
                     <SelectItem value="#dcfce7"><span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#dcfce7] border border-[#22c55e]" /> Verde</span></SelectItem>
                     <SelectItem value="#dbeafe"><span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#dbeafe] border border-[#3b82f6]" /> Azul</span></SelectItem>
                     <SelectItem value="#f3e8ff"><span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#f3e8ff] border border-[#a855f7]" /> Púrpura</span></SelectItem>
                     <SelectItem value="#ffe4e6"><span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ffe4e6] border border-[#f43f5e]" /> Rosa</span></SelectItem>
                   </SelectContent>
                 </Select>
               </div>
             </div>

          </div>

          {/* Description Editor */}
          <div className="space-y-2 pt-2">
            <h3 className="text-sm font-medium text-muted-foreground px-1 mb-1">Notas y Descripción</h3>
            <Textarea 
              value={desc}
              disabled={task.status === "completed"}
              onChange={(e) => setDesc(e.target.value)}
              onBlur={() => handleTextBlur('description', desc)}
              className="min-h-[250px] resize-none border px-4 py-3 bg-muted/20 focus-visible:bg-transparent text-sm shadow-sm transition-colors rounded-xl disabled:opacity-70 disabled:cursor-text"
              placeholder="¿Qué necesitas recordar de esto? Escribe tus notas aquí..."
            />
          </div>
          
        </div>
      </SheetContent>
    </Sheet>
  )
}
