"use client"

import * as React from "react"
import { Flag } from "lucide-react"

import { trpc } from "@/lib/trpc"
import { TaskItem } from "@/components/tasks/task-item"
import { TaskDetailsDrawer } from "@/components/tasks/task-details-drawer"
import { Loader2 } from "lucide-react"

import { withFallback } from "@/components/shared/with-fallback"

function PrioridadesPageContent() {
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

  const activeTasks = Array.isArray(tasks) ? tasks.filter((t: any) => t && t.status !== "completed" && t.status !== "trash") : []
  const highPriority = activeTasks.filter((t: any) => t?.priority === 1)
  const mediumPriority = activeTasks.filter((t: any) => t?.priority === 2)
  const lowPriority = activeTasks.filter((t: any) => t?.priority === 3 || typeof t?.priority !== 'number')

  return (
    <div className="flex-1 w-full h-full bg-background lg:p-4">
      <div className="max-w-5xl mx-auto space-y-6 pb-20 lg:pb-8 relative min-h-[calc(100vh-80px)] px-4 lg:px-0 pt-4 lg:pt-0">
        <div className="flex justify-between items-center mb-6 pt-2">
          <h1 className="text-[24px] font-light tracking-[-0.03em]">Prioridades</h1>
        </div>
        
        {error ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-red-500 mb-2">Error al cargar las tareas.</p>
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start h-[calc(100vh-220px)]">
            {/* High Priority */}
            <div className="flex flex-col h-full space-y-4 p-4 border rounded-xl bg-card overflow-hidden">
              <div className="flex items-center gap-2 pb-2 border-b shrink-0">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <h2 className="font-medium text-lg">Alta Prioridad</h2>
                <span className="text-muted-foreground text-sm ml-auto bg-muted px-2 py-0.5 rounded-full">{highPriority.length}</span>
              </div>
              <div className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {highPriority.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-4">No hay tareas urgentes.</p>
                ) : (
                  highPriority.map((t: any) => <TaskItem key={t.id} task={t} onComplete={onComplete} onDelete={onDelete} onClick={(task) => { setSelectedTaskId(task.id); setIsDrawerOpen(true); }} />)
                )}
              </div>
            </div>

            {/* Medium Priority */}
            <div className="flex flex-col h-full space-y-4 p-4 border rounded-xl bg-card overflow-hidden">
              <div className="flex items-center gap-2 pb-2 border-b shrink-0">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <h2 className="font-medium text-lg">Prioridad Media</h2>
                <span className="text-muted-foreground text-sm ml-auto bg-muted px-2 py-0.5 rounded-full">{mediumPriority.length}</span>
              </div>
              <div className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {mediumPriority.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-4">No hay tareas de prioridad media.</p>
                ) : (
                  mediumPriority.map((t: any) => <TaskItem key={t.id} task={t} onComplete={onComplete} onDelete={onDelete} onClick={(task) => { setSelectedTaskId(task.id); setIsDrawerOpen(true); }} />)
                )}
              </div>
            </div>

            {/* Low Priority */}
            <div className="flex flex-col h-full space-y-4 p-4 border rounded-xl bg-card overflow-hidden">
              <div className="flex items-center gap-2 pb-2 border-b shrink-0">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <h2 className="font-medium text-lg">Prioridad Baja</h2>
                <span className="text-muted-foreground text-sm ml-auto bg-muted px-2 py-0.5 rounded-full">{lowPriority.length}</span>
              </div>
              <div className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {lowPriority.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-4">No hay tareas de prioridad baja.</p>
                ) : (
                  lowPriority.map((t: any) => <TaskItem key={t.id} task={t} onComplete={onComplete} onDelete={onDelete} onClick={(task) => { setSelectedTaskId(task.id); setIsDrawerOpen(true); }} />)
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <TaskDetailsDrawer 
        task={activeTasks.find((t: any) => t.id === selectedTaskId) || null} 
        open={isDrawerOpen} 
        onOpenChange={setIsDrawerOpen} 
      />
    </div>
  )
}

export default withFallback(PrioridadesPageContent)
