"use client"

import * as React from "react"
import { trpc } from "@/lib/trpc"
import { Loader2, Plus, BarChart3, Clock, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { ProjectDetailsDrawer } from "./project-details-drawer"
import { TaskIcon } from "@/components/ui/TaskIcon"

export function ProjectListView({ onCreateClick }: { onCreateClick?: () => void }) {
  const { data: projects, isLoading } = trpc.projects.list.useQuery()
  const [selectedProject, setSelectedProject] = React.useState<any | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false)

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10 opacity-50">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="text-center py-12 px-4 border border-dashed rounded-lg bg-muted/20">
        <BarChart3 className="w-8 h-8 mx-auto text-muted-foreground opacity-50 mb-3" />
        <p className="text-sm text-muted-foreground">Todavía no tenés ningún proyecto en curso.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={onCreateClick}>
          <Plus className="w-4 h-4 mr-2" /> Crear Proyecto
        </Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {projects.map((project) => {
        const activeProjectTasks = project.tasks?.filter((t: any) => t.status !== "trash" && t.deleted_at === null) || []
        const totalTasks = activeProjectTasks.length
        const completedTasks = activeProjectTasks.filter((t: any) => t.status === "completed").length || 0
        const progressPercentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)

        return (
          <div 
            key={project.id} 
            onClick={() => {
              setSelectedProject(project)
              setIsDrawerOpen(true)
            }}
            className="flex flex-col p-5 bg-background border rounded-xl shadow-sm hover:shadow-sm transition-shadow cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <TaskIcon icon={project.icon} size={18} />
                {project.color && (
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                )}
                <h3 className="font-medium text-lg tracking-tight group-hover:text-accent transition-colors truncate">{project.name}</h3>
              </div>
              <span className={cn(
                "px-2 py-0.5 text-xs font-medium rounded-full",
                project.status === 'completed' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                project.status === 'planned' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                project.status === 'archived' ? "bg-muted text-muted-foreground" : "bg-accent/10 text-accent"
              )}>
                {project.status === 'active' ? 'En Progreso' : project.status === 'completed' ? 'Completado' : project.status === 'planned' ? 'Planificado' : 'Archivado'}
              </span>
            </div>
            
            {project.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                {project.description}
              </p>
            )}

            {!project.description && <div className="flex-1" />}

            <div className="mt-4 space-y-3">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> {completedTasks}/{totalTasks} tareas</span>
                <span>{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              
              {project.due_at && (
                <div className="flex items-center text-xs text-muted-foreground mt-2 pt-2 border-t">
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  Vence: {new Date(project.due_at).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        )
      })}
      
      <ProjectDetailsDrawer 
        project={selectedProject} 
        open={isDrawerOpen} 
        onOpenChange={setIsDrawerOpen} 
      />
    </div>
  )
}
