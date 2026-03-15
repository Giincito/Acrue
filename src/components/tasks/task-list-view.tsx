"use client"

import * as React from "react"
import { trpc } from "@/lib/trpc"
import { useTaskStore, Task } from "@/store/useTaskStore"
import { TaskItem } from "@/components/tasks/task-item"
import { Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TaskListViewProps {
  status: "inbox" | "today" | "upcoming" | "someday" | "completed"
  emptyText?: string
}

export function TaskListView({ status, emptyText = "No hay tareas" }: TaskListViewProps) {
  const { tasks, setTasks, updateTask, removeTask } = useTaskStore()
  
  // Fetch tasks
  const { data, isLoading } = trpc.tasks.list.useQuery(
    { status: status === "completed" ? undefined : status }
  )

  React.useEffect(() => {
    if (data) {
      const filtered = status === "completed" 
        ? data.filter(t => t.status === "completed") 
        : data.filter(t => t.status === status);
        
      setTasks(filtered as unknown as Task[]);
    }
  }, [data, status, setTasks])

  const updateMutation = trpc.tasks.update.useMutation()
  const deleteMutation = trpc.tasks.delete.useMutation()

  const handleComplete = async (id: string) => {
    // Optimistic Update
    updateTask(id, { status: "completed", completed_at: new Date().toISOString() })
    
    // Server Mutation
    try {
      await updateMutation.mutateAsync({ 
        id, 
        status: "completed", 
        completed_at: new Date().toISOString() 
      })
    } catch (e) {
      // Revert if failed (in a real scenario we'd refetch or store previous state)
      // For now, tRPC error boundary would catch generic errors
      console.error("Failed to update task", e)
    }
  }

  const handleDelete = async (id: string) => {
    // Optimistic Update
    removeTask(id)
    
    try {
      await deleteMutation.mutateAsync({ id })
    } catch (e) {
      console.error("Failed to delete task", e)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10 opacity-50">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  // Use local state for immediate feedback
  const displayTasks = tasks.filter(t => status === "completed" ? t.status === "completed" : t.status === status)

  return (
    <div className="flex flex-col space-y-2">
      {displayTasks.length === 0 ? (
        <div className="text-center py-12 px-4 border border-dashed rounded-lg bg-muted/20">
          <p className="text-sm text-muted-foreground">{emptyText}</p>
          <Button variant="outline" size="sm" className="mt-4">
            <Plus className="w-4 h-4 mr-2" /> Agregar tarea
          </Button>
        </div>
      ) : (
        displayTasks.map((task) => (
          <TaskItem 
            key={task.id} 
            task={task} 
            onComplete={handleComplete} 
            onDelete={handleDelete} 
          />
        ))
      )}
    </div>
  )
}
