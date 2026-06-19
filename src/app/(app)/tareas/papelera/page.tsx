"use client"

import * as React from "react"

import { ModuleHeader } from "@/components/layout/module-header"
import { ModuleShell } from "@/components/layout/module-shell"
import { TaskListView } from "@/components/tasks/task-list-view"

export default function PapeleraPage() {
  return (
    <ModuleShell>
      <ModuleHeader
        module="Tareas"
        title="Papelera"
        description="Cualquier tarea eliminada permanece aca hasta borrarla definitivamente."
      />
      <TaskListView status="trash" emptyText="La papelera esta vacia." />
    </ModuleShell>
  )
}
