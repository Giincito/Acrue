"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { GraduationCap, Loader2, TrendingDown, TrendingUp } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { cn } from "@/lib/utils"
import { calculateWeightedAverage } from "@/lib/utils/grades"
import type { SubjectStatus } from "@/server/schema/subject"

interface SubjectAssignment {
  grade: number | null
  weight: number | null
}

interface SubjectWithGrades {
  id: string
  name: string
  code: string | null
  status: SubjectStatus
  target_grade: number | null
  credits?: number | null
  assignments?: SubjectAssignment[] | null
}

interface SubjectAverage extends SubjectWithGrades {
  avg: number
  credits: number
}

const hasGrade = (assignment: SubjectAssignment) =>
  assignment.grade !== null && assignment.grade !== undefined

export function AverageTab() {
  const { data: subjects, isLoading } = trpc.subjects.list.useQuery()
  const subjectRows = (subjects ?? []) as SubjectWithGrades[]

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10 opacity-50">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  if (subjectRows.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed rounded-lg bg-muted/20">
        <GraduationCap className="w-8 h-8 mx-auto text-muted-foreground opacity-50 mb-3" />
        <p className="text-sm text-muted-foreground">Carga materias para ver tu promedio general.</p>
      </div>
    )
  }

  const subjectsWithGrades: SubjectAverage[] = subjectRows
    .filter((subject) => (subject.assignments ?? []).some(hasGrade))
    .map((subject) => {
      const assignments = subject.assignments ?? []
      return {
        ...subject,
        avg: calculateWeightedAverage(assignments),
        credits: subject.credits ?? 1,
      }
    })

  const totalCredits = subjectsWithGrades.reduce((sum, subject) => sum + subject.credits, 0)
  const weightedSum = subjectsWithGrades.reduce((sum, subject) => sum + subject.avg * subject.credits, 0)
  const generalAverage = totalCredits > 0 ? weightedSum / totalCredits : 0

  const approved = subjectRows.filter((subject) => subject.status === "approved").length
  const failed = subjectRows.filter((subject) => subject.status === "failed").length
  const inProgress = subjectRows.filter((subject) => subject.status === "in_progress").length
  const pending = subjectRows.filter((subject) => subject.status === "pending").length

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="rounded-xl border bg-gradient-to-br from-accent/5 via-background to-accent/10 p-6 text-center"
      >
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Promedio general</p>
        <p className="text-5xl font-medium tabular-nums" style={{ fontWeight: 500 }}>
          {subjectsWithGrades.length > 0 ? generalAverage.toFixed(2) : "-"}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Basado en {subjectsWithGrades.length} materia{subjectsWithGrades.length !== 1 ? "s" : ""} con notas
        </p>
      </motion.div>

      <div className="grid grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-card border text-center">
          <p className="text-lg font-medium tabular-nums" style={{ fontWeight: 500 }}>{approved}</p>
          <p className="text-xs text-muted-foreground">Aprobadas</p>
        </div>
        <div className="p-3 rounded-xl bg-card border text-center">
          <p className="text-lg font-medium tabular-nums" style={{ fontWeight: 500 }}>{inProgress}</p>
          <p className="text-xs text-muted-foreground">Cursando</p>
        </div>
        <div className="p-3 rounded-xl bg-card border text-center">
          <p className="text-lg font-medium tabular-nums" style={{ fontWeight: 500 }}>{pending}</p>
          <p className="text-xs text-muted-foreground">Pendientes</p>
        </div>
        <div className="p-3 rounded-xl bg-card border text-center">
          <p className="text-lg font-medium tabular-nums" style={{ fontWeight: 500 }}>{failed}</p>
          <p className="text-xs text-muted-foreground">Recursadas</p>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground px-1">Promedio por materia</h2>
        {subjectsWithGrades.length === 0 ? (
          <p className="text-sm text-muted-foreground px-1">Sin notas cargadas aun.</p>
        ) : (
          subjectsWithGrades.map((subject, index) => (
            <motion.div
              key={subject.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="flex items-center gap-3 p-3 rounded-lg border bg-background"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ fontWeight: 500 }}>{subject.name}</p>
                {subject.code && <p className="text-xs text-muted-foreground font-mono">{subject.code}</p>}
              </div>

              {subject.target_grade && (
                <div className="flex items-center gap-1">
                  {subject.avg >= subject.target_grade ? (
                    <TrendingUp className="w-3.5 h-3.5 text-success" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-warning" />
                  )}
                </div>
              )}

              <span
                className={cn(
                  "text-sm font-medium tabular-nums min-w-[40px] text-right",
                  subject.avg >= 7
                    ? "text-success"
                    : subject.avg >= 4
                      ? "text-foreground"
                      : "text-destructive"
                )}
                style={{ fontWeight: 500 }}
              >
                {subject.avg.toFixed(2)}
              </span>

              <span className="text-xs text-muted-foreground">{subject.credits}cr</span>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
