"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"
import { Plus } from "lucide-react"

import { AverageTab } from "@/components/estudio/average-tab"
import { CampusTab } from "@/components/estudio/campus-tab"
import { SubjectList } from "@/components/estudio/subject-list"
import { WeeklySchedule } from "@/components/estudio/weekly-schedule"
import { ModuleHeader } from "@/components/layout/module-header"
import { ModuleShell } from "@/components/layout/module-shell"
import { TabTransition } from "@/components/layout/module-transition"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

const SubjectForm = dynamic(
  () => import("@/components/estudio/subject-form").then((mod) => mod.SubjectForm),
  {
    loading: () => (
      <div className="flex justify-center p-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    ),
  }
)

type StudyTab = "materias" | "promedio" | "horarios" | "campus"

const STUDY_TAB_COPY: Record<StudyTab, { title: string; description: string }> = {
  materias: {
    title: "Materias",
    description: "Cursadas, entregas y avance académico en un solo lugar.",
  },
  promedio: {
    title: "Promedio",
    description: "Notas y rendimiento acumulado por materia.",
  },
  horarios: {
    title: "Horarios",
    description: "Bloques semanales para organizar clases y estudio.",
  },
  campus: {
    title: "Campus Moodle",
    description: "Sincronización y estado de integraciones académicas.",
  },
}

function getStudyTab(tab: string | null): StudyTab {
  if (tab === "promedio" || tab === "horarios" || tab === "campus") {
    return tab
  }

  return "materias"
}

function EstudioContent() {
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const searchParams = useSearchParams()
  const activeTab = getStudyTab(searchParams.get("tab"))
  const copy = STUDY_TAB_COPY[activeTab]

  return (
    <ModuleShell>
      <ModuleHeader
        module="Estudio"
        title={copy.title}
        description={copy.description}
        actions={
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger
              render={
                <Button
                  size="icon"
                  aria-label="Crear materia"
                  className="h-12 w-12 cursor-pointer rounded-full bg-accent text-accent-foreground shadow-sm hover:bg-accent/90 lg:h-10 lg:w-auto lg:rounded-md lg:px-4"
                >
                  <Plus className="h-6 w-6 lg:mr-2 lg:h-5 lg:w-5" />
                  <span className="hidden lg:inline">Nueva materia</span>
                </Button>
              }
            />
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Nueva materia</DialogTitle>
              </DialogHeader>
              <div className="pt-4">
                <SubjectForm onSuccess={() => setIsCreateOpen(false)} />
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="min-w-0">
        <TabTransition value={activeTab}>
          {activeTab === "materias" && <SubjectList onCreateClick={() => setIsCreateOpen(true)} />}
          {activeTab === "promedio" && <AverageTab />}
          {activeTab === "horarios" && <WeeklySchedule />}
          {activeTab === "campus" && <CampusTab />}
        </TabTransition>
      </div>
    </ModuleShell>
  )
}

export default function EstudioPage() {
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
      <EstudioContent />
    </React.Suspense>
  )
}
