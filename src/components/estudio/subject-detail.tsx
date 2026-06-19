"use client"

import * as React from "react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, BookOpen, CalendarDays, GraduationCap, Loader2, Pencil, Plus, Target, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { trpc } from "@/lib/trpc"
import { cn } from "@/lib/utils"
import { calculateWeightedAverage } from "@/lib/utils/grades"
import type { AssignmentType } from "@/server/schema/assignment"
import type { SubjectStatus } from "@/server/schema/subject"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AssignmentForm } from "./assignment-form"
import { SubjectForm } from "./subject-form"

const TYPE_LABELS: Record<AssignmentType, string> = {
  tp: "TP",
  parcial: "Parcial",
  final: "Final",
  quiz: "Quiz",
  proyecto: "Proyecto",
}

interface SubjectAssignment {
  id: string
  title: string
  type: AssignmentType
  grade: number | null
  weight: number | null
  due_at: string | null
}

interface SubjectDetailData {
  id: string
  name: string
  code: string | null
  commission: string | null
  status: SubjectStatus
  target_grade: number | null
  weekly_hours: number | null
  prerequisites?: string[] | null
  assignments?: SubjectAssignment[] | null
}

interface SubjectDetailProps {
  subjectId: string
}

const hasGrade = (assignment: SubjectAssignment) =>
  assignment.grade !== null && assignment.grade !== undefined

export function SubjectDetail({ subjectId }: SubjectDetailProps) {
  const { data: subjectData, isLoading } = trpc.subjects.getById.useQuery({ id: subjectId })
  const subject = subjectData as SubjectDetailData | undefined
  const deleteMutation = trpc.assignments.delete.useMutation()
  const utils = trpc.useUtils()
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [isEditSubjectOpen, setIsEditSubjectOpen] = React.useState(false)

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20 opacity-50">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  if (!subject) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">Materia no encontrada.</p>
        <Link href="/estudio" className="text-accent text-sm mt-2 inline-block hover:underline cursor-pointer">
          Volver a Estudio
        </Link>
      </div>
    )
  }

  const assignments = subject.assignments ?? []
  const avg = calculateWeightedAverage(assignments)
  const gradedCount = assignments.filter(hasGrade).length

  const handleDelete = async (assignmentId: string) => {
    try {
      await deleteMutation.mutateAsync({ id: assignmentId })
      utils.subjects.getById.invalidate({ id: subjectId })
      utils.subjects.list.invalidate()
      toast.success("Evaluación eliminada")
    } catch {
      toast.error("No se pudo eliminar la evaluación")
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/estudio" className="inline-flex items-center text-sm text-muted-foreground hover:text-accent transition-colors cursor-pointer gap-1">
        <ArrowLeft className="w-4 h-4" />
        Volver a Estudio
      </Link>

      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-accent" />
            <h1 className="text-2xl font-medium" style={{ fontWeight: 500 }}>{subject.name}</h1>
            {subject.code && (
              <span className="text-sm font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">{subject.code}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {subject.commission && <span>Comisión {subject.commission}</span>}
            {subject.weekly_hours && <span>{subject.weekly_hours}hs/semana</span>}
          </div>
        </div>

        <Dialog open={isEditSubjectOpen} onOpenChange={setIsEditSubjectOpen}>
          <DialogTrigger render={
            <Button variant="outline" size="sm" className="cursor-pointer">
              <Pencil className="w-4 h-4 mr-2" />
              Editar materia
            </Button>
          } />
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Editar materia</DialogTitle>
            </DialogHeader>
            <div className="pt-4">
              <SubjectForm initialData={subject} onSuccess={() => setIsEditSubjectOpen(false)} />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-card border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <GraduationCap className="w-3.5 h-3.5" />
            Promedio
          </div>
          <p className="text-2xl font-medium tabular-nums" style={{ fontWeight: 500 }}>
            {gradedCount > 0 ? avg.toFixed(2) : "-"}
          </p>
        </div>

        {subject.target_grade && (
          <div className="p-4 rounded-xl bg-card border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Target className="w-3.5 h-3.5" />
              Objetivo
            </div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-medium tabular-nums" style={{ fontWeight: 500 }}>{subject.target_grade}</p>
              {gradedCount > 0 && (
                <span
                  className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-md",
                    avg >= subject.target_grade
                      ? "bg-success/10 text-success"
                      : "bg-warning/10 text-warning"
                  )}
                >
                  {avg >= subject.target_grade ? "Alcanzado" : `Faltan ${(subject.target_grade - avg).toFixed(1)} pts`}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="p-4 rounded-xl bg-card border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <CalendarDays className="w-3.5 h-3.5" />
            Evaluaciones
          </div>
          <p className="text-2xl font-medium tabular-nums" style={{ fontWeight: 500 }}>
            {gradedCount}/{assignments.length}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Evaluaciones</h2>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger render={
              <Button size="sm" variant="outline" className="cursor-pointer">
                <Plus className="w-4 h-4 mr-2" /> Agregar
              </Button>
            } />
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Nueva evaluación</DialogTitle>
              </DialogHeader>
              <div className="pt-4">
                <AssignmentForm subjectId={subjectId} onSuccess={() => setIsFormOpen(false)} />
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {assignments.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-lg bg-muted/20">
            <p className="text-sm text-muted-foreground">No hay evaluaciones cargadas.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {assignments.map((assignment, index) => (
                <motion.div
                  key={assignment.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex items-center gap-3 p-3 bg-background border rounded-lg group hover:bg-muted/30 transition-colors"
                >
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground min-w-[56px] text-center">
                    {TYPE_LABELS[assignment.type] ?? assignment.type}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ fontWeight: 500 }}>{assignment.title}</p>
                    {assignment.due_at && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(assignment.due_at), "PPP", { locale: es })}
                      </p>
                    )}
                  </div>

                  {assignment.weight !== null && assignment.weight !== undefined && (
                    <span className="text-xs text-muted-foreground tabular-nums">{assignment.weight}%</span>
                  )}

                  <div
                    className={cn(
                      "text-sm font-medium tabular-nums min-w-[40px] text-right",
                      assignment.grade !== null && assignment.grade !== undefined
                        ? assignment.grade >= 4
                          ? "text-success"
                          : "text-destructive"
                        : "text-muted-foreground"
                    )}
                    style={{ fontWeight: 500 }}
                  >
                    {assignment.grade !== null && assignment.grade !== undefined
                      ? assignment.grade.toFixed(1)
                      : "-"}
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault()
                      handleDelete(assignment.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive cursor-pointer p-1"
                    aria-label={`Eliminar evaluación ${assignment.title}`}
                    title="Eliminar evaluación"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
