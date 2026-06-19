"use client"

import * as React from "react"
import { trpc } from "@/lib/trpc"
import { Loader2, Plus, BarChart3, Clock, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ProjectDetailsDrawer } from "./project-details-drawer"
import { TaskIcon } from "@/components/ui/TaskIcon"
import type { ProjectStatus } from "@/server/schema/project"

interface ProjectTaskSummary {
  status: string
  deleted_at: string | null
}

interface ProjectListItem {
  id: string
  name: string
  description: string | null
  status: ProjectStatus
  color: string | null
  icon: string | null
  due_at: string | null
  created_at: string
  tasks?: ProjectTaskSummary[] | null
}

/** Maps project status to semantic badge styles. */
function statusBadge(status: string) {
  switch (status as ProjectStatus) {
    case 'completed':
      return { bg: 'bg-success/10', text: 'text-success', label: 'Completado' }
    case 'paused':
      return { bg: 'bg-stone-100 dark:bg-stone-800/40', text: 'text-stone-600 dark:text-stone-400', label: 'Pausado' }
    case 'planned':
      return { bg: 'bg-accent/10', text: 'text-accent', label: 'Planificado' }
    case 'archived':
      return { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Archivado' }
    case 'active':
    default:
      return { bg: 'bg-accent/10', text: 'text-accent', label: 'En progreso' }
  }
}

export function ProjectListView({ onCreateClick }: { onCreateClick?: () => void }) {
  const { data: projects, isLoading } = trpc.projects.list.useQuery()
  const projectRows = (projects ?? []) as ProjectListItem[]
  const [selectedProject, setSelectedProject] = React.useState<ProjectListItem | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false)

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10 opacity-50">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  if (projectRows.length === 0) {
    return (
      <div className="text-center py-12 px-4 border border-dashed rounded-lg bg-muted/20">
        <BarChart3 className="w-8 h-8 mx-auto text-muted-foreground opacity-50 mb-3" />
        <p className="text-sm text-muted-foreground">Todavía no tenés ningún proyecto en curso.</p>
        <Button variant="outline" size="sm" className="mt-4 cursor-pointer" onClick={onCreateClick}>
          <Plus className="w-4 h-4 mr-2" /> Crear proyecto
        </Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {projectRows.map((project) => {
        const activeProjectTasks = project.tasks?.filter((t) => t.status !== "trash" && t.deleted_at === null) || []
        const totalTasks = activeProjectTasks.length
        const completedTasks = activeProjectTasks.filter((t) => t.status === "completed").length || 0
        const progressPercentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)
        const badge = statusBadge(project.status)

        return (
          <div 
            key={project.id} 
            onClick={() => {
              setSelectedProject(project)
              setIsDrawerOpen(true)
            }}
            className="flex flex-col p-5 bg-background border rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <TaskIcon icon={project.icon} size={18} />
                {project.color && (
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                )}
                <h3 className="font-medium text-lg group-hover:text-accent transition-colors truncate" style={{ fontWeight: 500 }}>
                  {project.name}
                </h3>
              </div>
              <span className={cn("px-2 py-0.5 text-xs font-medium rounded-full", badge.bg, badge.text)}>
                {badge.label}
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
              <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none"
                  style={{
                    width: `${progressPercentage}%`,
                    backgroundColor: 'var(--accent)',
                  }}
                />
              </div>
              
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
