"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { ProjectListView } from "@/components/projects/project-list-view"
import { ModuleHeader } from "@/components/layout/module-header"
import { ModuleShell } from "@/components/layout/module-shell"

const CreateProjectForm = dynamic(
  () => import("@/components/projects/create-project-form").then((mod) => mod.CreateProjectForm),
  { loading: () => <div className="p-8 flex justify-center"><div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div> }
)
import { Plus } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export default function ProyectosPage() {
  const [isProjectCreateOpen, setIsProjectCreateOpen] = React.useState(false)

  return (
    <ModuleShell>
        <ModuleHeader
          module="Tareas"
          title="Proyectos"
          description="Agrupa tareas por frente de trabajo."
          actions={
            <Dialog open={isProjectCreateOpen} onOpenChange={setIsProjectCreateOpen}>
              <DialogTrigger className="inline-flex h-12 w-12 cursor-pointer items-center justify-center whitespace-nowrap rounded-full bg-accent text-sm font-medium text-accent-foreground shadow-sm ring-offset-background transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 lg:h-10 lg:w-auto lg:rounded-md lg:px-4">
                <Plus className="h-6 w-6 lg:mr-2 lg:h-5 lg:w-5" />
                <span className="hidden lg:inline">Nuevo proyecto</span>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Nuevo proyecto</DialogTitle>
                </DialogHeader>
                <div className="pt-4">
                  <CreateProjectForm onSuccess={() => setIsProjectCreateOpen(false)} />
                </div>
              </DialogContent>
            </Dialog>
          }
        />
        <ProjectListView onCreateClick={() => setIsProjectCreateOpen(true)} />
    </ModuleShell>
  )
}
