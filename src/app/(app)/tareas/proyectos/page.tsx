"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { ProjectListView } from "@/components/projects/project-list-view"

const CreateProjectForm = dynamic(
  () => import("@/components/projects/create-project-form").then((mod) => mod.CreateProjectForm),
  { loading: () => <div className="p-8 flex justify-center"><div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div> }
)
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export default function ProyectosPage() {
  const [isProjectCreateOpen, setIsProjectCreateOpen] = React.useState(false)

  return (
    <div className="flex-1 w-full h-full bg-background lg:p-4">
      <div className="max-w-4xl mx-auto space-y-6 pb-20 lg:pb-8 relative min-h-[calc(100vh-80px)] px-4 lg:px-0 pt-4 lg:pt-0">
        <div className="flex justify-between items-center mb-6 pt-8">
          <h1 className="text-[24px] font-light tracking-[-0.03em]">Proyectos</h1>
          <Dialog open={isProjectCreateOpen} onOpenChange={setIsProjectCreateOpen}>
            <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 rounded-full shadow-sm bg-accent text-accent-foreground hover:bg-accent/90 lg:w-auto lg:px-4 lg:rounded-md h-12 w-12 lg:h-10">
              <Plus className="w-6 h-6 lg:w-5 lg:h-5 lg:mr-2" />
              <span className="hidden lg:inline">Nuevo Proyecto</span>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Nuevo Proyecto</DialogTitle>
              </DialogHeader>
              <div className="pt-4">
                <CreateProjectForm onSuccess={() => setIsProjectCreateOpen(false)} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <ProjectListView onCreateClick={() => setIsProjectCreateOpen(true)} />
      </div>
    </div>
  )
}
