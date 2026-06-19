"use client"

import * as React from "react"
import { SubjectDetail } from "@/components/estudio/subject-detail"
import { ModuleShell } from "@/components/layout/module-shell"
import { useParams } from "next/navigation"

export default function SubjectDetailPage() {
  const params = useParams()
  const subjectId = params.id as string

  return (
    <ModuleShell contentClassName="space-y-0 lg:pt-8">
      <SubjectDetail subjectId={subjectId} />
    </ModuleShell>
  )
}
