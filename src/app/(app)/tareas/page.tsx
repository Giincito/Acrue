"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"
import { Plus } from "lucide-react"

import { ModuleHeader } from "@/components/layout/module-header"
import { ModuleShell } from "@/components/layout/module-shell"
import { TabTransition } from "@/components/layout/module-transition"
import { TaskListView } from "@/components/tasks/task-list-view"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

const CreateTaskForm = dynamic(
  () => import("@/components/tasks/create-task-form").then((mod) => mod.CreateTaskForm),
  {
    loading: () => (
      <div className="flex justify-center p-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    ),
  }
)

type TaskTab = "inbox" | "today" | "upcoming" | "completed"

const TASK_TAB_COPY: Record<TaskTab, { title: string; description: string }> = {
  inbox: {
    title: "Bandeja",
    description: "Tareas capturadas para ordenar y convertir en accion.",
  },
  today: {
    title: "Hoy",
    description: "Lo que necesita atencion durante el dia.",
  },
  upcoming: {
    title: "Proximas",
    description: "Pendientes con fecha futura para planificar sin ruido.",
  },
  completed: {
    title: "Terminadas",
    description: "Historial de tareas completadas y progreso cerrado.",
  },
}

function getTaskTab(tab: string | null): TaskTab {
  if (tab === "today" || tab === "upcoming" || tab === "completed") {
    return tab
  }

  return "inbox"
}

function TasksContent() {
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const searchParams = useSearchParams()
  const activeTab = getTaskTab(searchParams.get("tab"))
  const copy = TASK_TAB_COPY[activeTab]

  return (
    <ModuleShell>
      <ModuleHeader
        module="Tareas"
        title={copy.title}
        description={copy.description}
        actions={
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger
              render={
                <Button
                  size="icon"
                  aria-label="Crear tarea"
                  className="h-12 w-12 cursor-pointer rounded-full bg-accent text-accent-foreground shadow-sm hover:bg-accent/90 lg:h-10 lg:w-auto lg:rounded-md lg:px-4"
                >
                  <Plus className="h-6 w-6 lg:mr-2 lg:h-5 lg:w-5" />
                  <span className="hidden lg:inline">Nueva tarea</span>
                </Button>
              }
            />
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Nueva tarea</DialogTitle>
              </DialogHeader>
              <div className="pt-4">
                <CreateTaskForm defaultStatus="inbox" onSuccess={() => setIsCreateOpen(false)} />
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="min-w-0">
        <TabTransition value={activeTab}>
          {activeTab === "inbox" && (
            <TaskListView status="inbox" emptyText="Bandeja limpia." onCreateClick={() => setIsCreateOpen(true)} />
          )}
          {activeTab === "today" && (
            <TaskListView status="today" emptyText="No hay tareas para hoy. Podes relajarte." onCreateClick={() => setIsCreateOpen(true)} />
          )}
          {activeTab === "upcoming" && (
            <TaskListView status="upcoming" emptyText="No hay tareas proximas." onCreateClick={() => setIsCreateOpen(true)} />
          )}
          {activeTab === "completed" && (
            <TaskListView status="completed" emptyText="No hay tareas completadas aun." onCreateClick={() => setIsCreateOpen(true)} />
          )}
        </TabTransition>
      </div>
    </ModuleShell>
  )
}

export default function TasksPageLoad() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-full w-full flex-1 items-center justify-center bg-background">
          <div className="flex animate-pulse items-center gap-2 text-muted-foreground">
            <div className="h-4 w-4 animate-bounce rounded-full bg-muted-foreground/30" />
            <div className="h-4 w-4 animate-bounce rounded-full bg-muted-foreground/30" style={{ animationDelay: "0.1s" }} />
            <div className="h-4 w-4 animate-bounce rounded-full bg-muted-foreground/30" style={{ animationDelay: "0.2s" }} />
          </div>
        </div>
      }
    >
      <TasksContent />
    </React.Suspense>
  )
}
