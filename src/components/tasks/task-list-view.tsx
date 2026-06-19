"use client"

import * as React from "react"
import { trpc } from "@/lib/trpc"
import { Task } from "@/store/useTaskStore"
import { TaskItem } from "@/components/tasks/task-item"
import { Plus } from "lucide-react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { startOfDay, endOfDay } from "date-fns"
import { toast } from "sonner"

const TaskDetailsDrawer = dynamic(
  () => import("@/components/tasks/task-details-drawer").then((mod) => mod.TaskDetailsDrawer),
  { ssr: false }
)

interface TaskListViewProps {
  status?: "inbox" | "today" | "upcoming" | "someday" | "completed" | "trash" | "active" | "all"
  contextTag?: string
  priority?: number
  projectId?: string
  emptyText?: string
  onCreateClick?: () => void
}

export function TaskListView({ status, contextTag, priority, projectId, emptyText = "No hay tareas", onCreateClick }: TaskListViewProps) {
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false)

  // Fetch tasks using exact timezone-safe boundaries from the client's clock
  const todayStart = startOfDay(new Date()).toISOString()
  const todayEnd = endOfDay(new Date()).toISOString()

  // Use a global 'active' query for all core lists to prevent duplicate-store race conditions
  const queryStatus = (status === "trash" || status === "completed" || status === "all") ? status : "active";

  const queryKey = {
    status: queryStatus,
    context_tag: contextTag,
    priority: priority,
    project_id: projectId,
    clientStartDate: todayStart,
    clientEndDate: todayEnd,
  }

  const utils = trpc.useUtils()
  const { data, isLoading } = trpc.tasks.list.useQuery(queryKey)
  const serverTasks = (data as unknown as Task[]) || [];

  const updateMutation = trpc.tasks.update.useMutation({
    onMutate: async (updatedTask) => {
      await utils.tasks.list.cancel(queryKey)
      const previousTasks = utils.tasks.list.getData(queryKey)

      utils.tasks.list.setData(queryKey, (oldData: Task[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map((t) =>
          t.id === updatedTask.id ? { ...t, ...updatedTask } : t
        );
      });

      return { previousTasks }
    },
    onError: (err, updatedTask, context) => {
      utils.tasks.list.setData(queryKey, context?.previousTasks)
    },
    onSettled: () => {
      utils.tasks.list.invalidate(queryKey)
    }
  })

  const deleteMutation = trpc.tasks.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.tasks.list.cancel(queryKey)
      await utils.tasks.trash.cancel()
      const previousTasks = utils.tasks.list.getData(queryKey)

      utils.tasks.list.setData(queryKey, (oldData: Task[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.filter((t) => t.id !== id);
      });

      return { previousTasks }
    },
    onError: (err, variables, context) => {
      utils.tasks.list.setData(queryKey, context?.previousTasks)
    },
    onSettled: () => {
      utils.tasks.list.invalidate(queryKey)
      utils.tasks.trash.invalidate()
    }
  })

  const permanentDeleteMutation = trpc.tasks.permanentDelete.useMutation({
    onMutate: async ({ id }) => {
      await utils.tasks.list.cancel(queryKey)
      const previousTasks = utils.tasks.list.getData(queryKey)

      utils.tasks.list.setData(queryKey, (oldData: Task[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.filter((t) => t.id !== id);
      });

      return { previousTasks }
    },
    onError: (err, variables, context) => {
      utils.tasks.list.setData(queryKey, context?.previousTasks)
    },
    onSettled: () => {
      utils.tasks.list.invalidate(queryKey)
    }
  })

  const restoreMutation = trpc.tasks.restore.useMutation({
    onMutate: async ({ id }) => {
      await utils.tasks.list.cancel(queryKey)
      await utils.tasks.trash.cancel()
      const previousTasks = utils.tasks.list.getData(queryKey)

      utils.tasks.list.setData(queryKey, (oldData: Task[] | undefined) => {
        if (!oldData) return oldData;
        // In the specific list view, restoring means it disappears if it's trash list
        return oldData.filter((t) => t.id !== id);
      });

      return { previousTasks }
    },
    onError: (err, variables, context) => {
      utils.tasks.list.setData(queryKey, context?.previousTasks)
    },
    onSettled: () => {
      utils.tasks.list.invalidate(queryKey)
      utils.tasks.trash.invalidate()
    }
  })

  const handleComplete = async (id: string) => {
    try {
      await updateMutation.mutateAsync({
        id,
        status: "completed",
        completed_at: new Date().toISOString()
      })
    } catch {
      toast.error("No se pudo completar la tarea")
    }
  }

  const handleUncomplete = async (id: string) => {
    try {
      await updateMutation.mutateAsync({
        id,
        status: "inbox",
        completed_at: null
      })
    } catch {
      toast.error("No se pudo reabrir la tarea")
    }
  }

  const handleRestore = async (id: string) => {
    try {
       await restoreMutation.mutateAsync({ id })
    } catch {
       toast.error("No se pudo restaurar la tarea")
    }
  }

  const handleDelete = async (id: string) => {
    try {
      if (status === "trash") {
        await permanentDeleteMutation.mutateAsync({ id })
      } else {
        await deleteMutation.mutateAsync({ id })
      }
    } catch {
      toast.error(status === "trash" ? "No se pudo eliminar la tarea" : "No se pudo mover la tarea a la papelera")
    }
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTaskId(task.id)
    setIsDrawerOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col space-y-2 max-w-3xl mx-auto w-full">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-full h-[56px] bg-muted/40 animate-pulse rounded-lg border border-border/20" />
        ))}
      </div>
    )
  }

  // local filtering for the active views over the globally fetched 'active' set
  const displayTasks = serverTasks.filter(t => {
    // 1. Status Matrix Filtering
    if (status === "all") {
       if (t.status === "trash") return false;
    } else if (status === "completed") {
      if (t.status !== "completed") return false;
    } else if (status === "trash") {
      if (t.status !== "trash") return false;
    } else {
      // If we are in any active view, hide completed/trash
      if (t.status === "completed" || t.status === "trash") return false;

      if (status === "inbox" && t.status !== "inbox" && t.status !== "someday") return false;

      if (status === "today") {
        if (!t.due_at) return false;
        const due = new Date(t.due_at);
        if (due < new Date(todayStart) || due > new Date(todayEnd)) return false;
      }

      if (status === "upcoming") {
        if (!t.due_at) return false;
        if (new Date(t.due_at) <= new Date(todayEnd)) return false;
      }
    }

    // 2. Tag and Priority Filtering
    if (contextTag && t.context_tag !== contextTag) return false;
    if (priority && t.priority !== priority) return false;

    return true;
  })

  return (
    <div className="flex flex-col max-w-3xl mx-auto w-full">
      <div className="bg-secondary/50 dark:bg-secondary/20 p-2 sm:p-3 rounded-lg flex flex-col space-y-1.5 shadow-inner ring-1 ring-black/5 dark:ring-white/5">
        {displayTasks.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed rounded-xl bg-background/50 backdrop-blur-sm">
            <p className="text-sm text-muted-foreground">{emptyText}</p>
            {onCreateClick && (
              <Button variant="outline" size="sm" className="mt-4" onClick={onCreateClick}>
                <Plus className="w-4 h-4 mr-2" /> Agregar tarea
              </Button>
            )}
          </div>
        ) : (
          displayTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onComplete={handleComplete}
              onUncomplete={handleUncomplete}
              onRestore={handleRestore}
              onDelete={handleDelete}
              onClick={handleTaskClick}
            />
          ))
        )}
      </div>
      <TaskDetailsDrawer
        task={serverTasks.find(t => t.id === selectedTaskId) || null}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
      />
      {displayTasks.length > 0 && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
            className="mt-8 mb-12 mx-auto w-max px-4 py-1.5 rounded-full border border-border/40 bg-muted/30 backdrop-blur-md shadow-sm text-center text-[10px] uppercase tracking-wider font-medium text-muted-foreground/70 select-none flex items-center gap-3"
          >
            <span>← Desliza para borrar</span>
            <div className="w-1 h-1 rounded-full bg-border" />
            <span>Desliza para {status === "trash" ? "deshacer" : "completar"} →</span>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}
