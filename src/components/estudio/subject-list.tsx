"use client"

import * as React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { BookOpen, ChevronRight, Loader2, Plus } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { cn } from "@/lib/utils"
import { calculateWeightedAverage } from "@/lib/utils/grades"
import type { SubjectStatus } from "@/server/schema/subject"
import { Button } from "@/components/ui/button"

interface SubjectAssignment {
  grade: number | null
  weight: number | null
}

interface SubjectListItem {
  id: string
  name: string
  code: string | null
  commission: string | null
  status: SubjectStatus
  target_grade: number | null
  assignments?: SubjectAssignment[] | null
}

function statusBadge(status: SubjectStatus) {
  switch (status) {
    case "approved":
      return { bg: "bg-success/10", text: "text-success", label: "Aprobada" }
    case "failed":
      return { bg: "bg-destructive/10", text: "text-destructive", label: "Desaprobada" }
    case "in_progress":
      return { bg: "bg-accent/10", text: "text-accent", label: "Cursando" }
    case "pending":
    default:
      return { bg: "bg-stone-100 dark:bg-stone-800/40", text: "text-stone-600 dark:text-stone-400", label: "Pendiente" }
  }
}

interface SubjectListProps {
  onCreateClick?: () => void
}

const hasGrade = (assignment: SubjectAssignment) =>
  assignment.grade !== null && assignment.grade !== undefined

export function SubjectList({ onCreateClick }: SubjectListProps) {
  const { data: subjects, isLoading } = trpc.subjects.list.useQuery()
  const subjectRows = (subjects ?? []) as SubjectListItem[]

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10 opacity-50">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  if (subjectRows.length === 0) {
    return (
      <div className="text-center py-12 px-4 border border-dashed rounded-lg bg-muted/20">
        <BookOpen className="w-8 h-8 mx-auto text-muted-foreground opacity-50 mb-3" />
        <p className="text-sm text-muted-foreground">Todavía no tenés materias cargadas.</p>
        <Button variant="outline" size="sm" className="mt-4 cursor-pointer" onClick={onCreateClick}>
          <Plus className="w-4 h-4 mr-2" /> Agregar materia
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {subjectRows.map((subject, index) => {
        const assignments = subject.assignments ?? []
        const graded = assignments.filter(hasGrade)
        const avg = calculateWeightedAverage(assignments)
        const badge = statusBadge(subject.status)

        return (
          <motion.div
            key={subject.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.25 }}
          >
            <Link
              href={`/estudio/materias/${subject.id}`}
              className="flex items-center gap-4 p-4 bg-background border rounded-xl hover:shadow-md transition-[background-color,border-color,box-shadow,color] duration-150 ease-out motion-reduce:transition-none group cursor-pointer"
            >
              <div
                className="w-1 h-12 rounded-full shrink-0"
                style={{ backgroundColor: subject.status === "approved" ? "var(--success)" : subject.status === "failed" ? "var(--destructive)" : "var(--accent)" }}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-base truncate group-hover:text-accent transition-colors" style={{ fontWeight: 500 }}>
                    {subject.name}
                  </h3>
                  {subject.code && (
                    <span className="text-xs text-muted-foreground font-mono shrink-0">{subject.code}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className={cn("px-1.5 py-0.5 rounded-md", badge.bg, badge.text)}>
                    {badge.label}
                  </span>
                  {subject.commission && (
                    <span>Comisión {subject.commission}</span>
                  )}
                  {graded.length > 0 && (
                    <span className="font-medium text-foreground">
                      Promedio: {avg.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {subject.target_grade && graded.length > 0 && (
                  <div
                    className={cn(
                      "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md",
                      avg >= subject.target_grade
                        ? "bg-success/10 text-success"
                        : "bg-warning/10 text-warning"
                    )}
                  >
                    Meta {subject.target_grade}
                  </div>
                )}
                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          </motion.div>
        )
      })}
    </div>
  )
}
