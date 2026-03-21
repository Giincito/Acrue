"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { TaskListView } from "@/components/tasks/task-list-view"

const CreateTaskForm = dynamic(
  () => import("@/components/tasks/create-task-form").then((mod) => mod.CreateTaskForm),
  { loading: () => <div className="p-8 flex justify-center"><div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div> }
)
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"

function TasksContent() {
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const currentTab = searchParams.get("tab") || "inbox"

  const PageTransition = ({ children, value }: { children: React.ReactNode, value: string }) => (
    <AnimatePresence mode="wait">
      <motion.div
        key={value}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )

  return (
    <div className="flex-1 w-full h-full bg-background lg:p-4">
      <div className="max-w-4xl mx-auto space-y-6 pb-20 lg:pb-8 relative min-h-[calc(100vh-80px)] px-4 lg:px-0 pt-4 lg:pt-0">
        
        {/* Header section */}
        <div className="flex justify-between items-center mb-6 pt-8">
          <h1 className="text-[24px] font-light tracking-[-0.03em]">Tareas</h1>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger render={
              <Button size="icon" className="rounded-full shadow-sm bg-accent text-accent-foreground hover:bg-accent/90 lg:w-auto lg:px-4 lg:rounded-md h-12 w-12 lg:h-10">
                <Plus className="w-6 h-6 lg:w-5 lg:h-5 lg:mr-2" />
                <span className="hidden lg:inline">Nueva Tarea</span>
              </Button>
            } />
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
        <Tabs 
          value={currentTab} 
          className="w-full"
          onValueChange={(tab) => {
             router.push(`/tareas?tab=${tab}`, { scroll: false })
          }}
        >
          <TabsList className="relative grid w-full grid-cols-4 mb-6 h-12 items-center justify-center rounded-xl bg-muted/30 p-1 text-muted-foreground ring-1 ring-black/5 dark:ring-white/5">
            {[
              { id: "inbox", label: "Bandeja" },
              { id: "today", label: "Hoy" },
              { id: "upcoming", label: "Próximas" },
              { id: "completed", label: "Terminadas" }
            ].map((tab) => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id} 
                className="relative cursor-pointer h-full rounded-lg data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-foreground transition-colors overflow-hidden"
              >
                {currentTab === tab.id && (
                  <motion.div 
                    layoutId="active-tab-indicator" 
                    className="absolute inset-0 bg-background rounded-lg shadow-sm ring-1 ring-black/5 dark:ring-white/10" 
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 text-sm font-medium tracking-tight">
                  {tab.label}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          
          <TabsContent value="inbox" className="mt-0 outline-none">
            <PageTransition value="inbox">
              <TaskListView status="inbox" emptyText="Tu Bandeja está limpia. ¡Excelente!" onCreateClick={() => setIsCreateOpen(true)} />
            </PageTransition>
          </TabsContent>
          
          <TabsContent value="today" className="mt-0 outline-none">
            <PageTransition value="today">
              <TaskListView status="today" emptyText="No hay tareas para hoy. Podés relajarte." onCreateClick={() => setIsCreateOpen(true)} />
            </PageTransition>
          </TabsContent>
          
          <TabsContent value="upcoming" className="mt-0 outline-none">
            <PageTransition value="upcoming">
              <TaskListView status="upcoming" emptyText="No hay tareas próximas." onCreateClick={() => setIsCreateOpen(true)} />
            </PageTransition>
          </TabsContent>
          
          <TabsContent value="completed" className="mt-0 outline-none">
            <PageTransition value="completed">
              <TaskListView status="completed" emptyText="No hay tareas completadas aún." onCreateClick={() => setIsCreateOpen(true)} />
            </PageTransition>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default function TasksPageLoad() {
  return (
    <React.Suspense fallback={
      <div className="flex-1 w-full h-full bg-background flex items-center justify-center">
        <div className="animate-pulse flex items-center gap-2 text-muted-foreground">
          <div className="w-4 h-4 rounded-full bg-muted-foreground/30 animate-bounce" />
          <div className="w-4 h-4 rounded-full bg-muted-foreground/30 animate-bounce" style={{ animationDelay: "0.1s" }} />
          <div className="w-4 h-4 rounded-full bg-muted-foreground/30 animate-bounce" style={{ animationDelay: "0.2s" }} />
        </div>
      </div>
    }>
      <TasksContent />
    </React.Suspense>
  )
}

