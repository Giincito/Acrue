"use client"

import * as React from "react"
import { Tag } from "lucide-react"

import { trpc } from "@/lib/trpc"
import { ModuleHeader } from "@/components/layout/module-header"
import { ModuleShell } from "@/components/layout/module-shell"
import { TaskItem } from "@/components/tasks/task-item"
import { TaskDetailsDrawer } from "@/components/tasks/task-details-drawer"
import { Loader2 } from "lucide-react"
import type { Task } from "@/store/useTaskStore"

export default function EtiquetasPage() {
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false)

  const { data: tasks, isLoading, error } = trpc.tasks.list.useQuery({})

  const handleUpdate = trpc.tasks.update.useMutation()
  const trpcContext = trpc.useUtils()

  const onComplete = (id: string) => {
    handleUpdate.mutate({ id, status: "completed" }, {
      onSuccess: () => trpcContext.tasks.list.invalidate()
    })
  }

  const onDelete = (id: string) => {
    handleUpdate.mutate({ id, status: "trash" }, {
      onSuccess: () => trpcContext.tasks.list.invalidate()
    })
  }

  const activeTasks: Task[] = Array.isArray(tasks)
    ? tasks.filter(
        (task): task is Task => Boolean(task) && task.status !== "completed" && task.status !== "trash"
      )
    : []
  
  // Group by context_tag
  const groupedTasks = activeTasks.reduce<Record<string, Task[]>>((acc, task) => {
    const tag = task.context_tag || "Sin etiqueta"
    if (!acc[tag]) acc[tag] = []
    acc[tag].push(task)
    return acc
  }, {})

  const tags = Object.keys(groupedTasks).sort((a, b) => a === "Sin etiqueta" ? 1 : b === "Sin etiqueta" ? -1 : a.localeCompare(b))

  return (
    <ModuleShell width="wide">
        <ModuleHeader
          module="Tareas"
          title="Etiquetas"
          description="Tareas agrupadas por contexto o ubicacion."
        />
        
        {error ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-destructive mb-2">Error al cargar las etiquetas.</p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground opacity-50" />
          </div>
        ) : !tasks ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <h2 className="text-xl font-medium mb-2">Sin datos</h2>
            <p className="text-muted-foreground">No se pudo cargar la lista de tareas.</p>
          </div>
        ) : tags.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 border border-dashed rounded-xl bg-muted/10 text-center">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-6">
              <Tag className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-xl font-medium mb-2">Aún no hay etiquetas</h2>
            <p className="text-muted-foreground max-w-md">
              Añade un contexto o etiqueta a tus tareas (Ej: @casa, @trabajo) y aparecerán agrupadas aquí.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start h-[calc(100vh-220px)]">
            {tags.map(tag => (
              <div key={tag} className="flex flex-col h-full space-y-4 p-5 border rounded-xl bg-card overflow-hidden">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b shrink-0">
                  <Tag className="w-4 h-4 text-accent" />
                  <h2 className="font-medium text-lg">{tag}</h2>
                  <span className="text-muted-foreground text-sm ml-auto bg-muted px-2 py-0.5 rounded-full">{groupedTasks[tag].length}</span>
                </div>
                <div className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {groupedTasks[tag].map((t) => (
                    <TaskItem 
                      key={t.id} 
                      task={t} 
                      onComplete={onComplete} 
                      onDelete={onDelete} 
                      onClick={(task) => { setSelectedTaskId(task.id); setIsDrawerOpen(true); }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      <TaskDetailsDrawer 
        task={activeTasks.find(t => t.id === selectedTaskId) || null} 
        open={isDrawerOpen} 
        onOpenChange={setIsDrawerOpen} 
      />
    </ModuleShell>
  )
}
