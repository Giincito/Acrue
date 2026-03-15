"use client"

import * as React from "react"
import { TaskListView } from "@/components/tasks/task-list-view"
import { CreateTaskForm } from "@/components/tasks/create-task-form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export default function TasksPage() {
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)

  return (
    <div className="flex-1 w-full h-full bg-background lg:p-4">
      <div className="max-w-4xl mx-auto space-y-6 pb-20 lg:pb-8 relative min-h-[calc(100vh-80px)] px-4 lg:px-0 pt-4 lg:pt-0">
        
        {/* Header section */}
        <div className="flex justify-between items-center mb-6 pt-2">
          <h1 className="text-3xl font-bold tracking-tight">Tareas</h1>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="icon" className="rounded-full shadow-md bg-[#2282fa] text-white hover:bg-[#2282fa]/90 lg:w-auto lg:px-4 lg:rounded-md h-12 w-12 lg:h-10">
                <Plus className="w-6 h-6 lg:w-5 lg:h-5 lg:mr-2" />
                <span className="hidden lg:inline">Nueva Tarea</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Nueva Tarea</DialogTitle>
              </DialogHeader>
              <div className="pt-4">
                <CreateTaskForm defaultStatus="inbox" onSuccess={() => setIsCreateOpen(false)} />
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Views */}
        <Tabs defaultValue="inbox" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="inbox">Inbox</TabsTrigger>
            <TabsTrigger value="today">Hoy</TabsTrigger>
            <TabsTrigger value="upcoming">Prómx.</TabsTrigger>
            <TabsTrigger value="someday">Backlog</TabsTrigger>
          </TabsList>
          
          <TabsContent value="inbox" className="mt-0">
            <TaskListView status="inbox" emptyText="Tu Inbox está limpio. ¡Excelente!" />
            
            <div className="mt-12 text-center text-xs text-muted-foreground opacity-50">
              <p>Swipe derecha (o click) para completar.<br/>Swipe izquierda para borrar.</p>
            </div>
          </TabsContent>
          
          <TabsContent value="today" className="mt-0">
            <TaskListView status="today" emptyText="No hay tareas para hoy. Podes relajarte." />
          </TabsContent>
          
          <TabsContent value="upcoming" className="mt-0">
            <TaskListView status="upcoming" emptyText="No hay tareas próximas." />
          </TabsContent>
          
          <TabsContent value="someday" className="mt-0">
            <TaskListView status="someday" emptyText="El Backlog está vacío." />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

