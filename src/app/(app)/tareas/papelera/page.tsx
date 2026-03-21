"use client"

import * as React from "react"
import { TaskListView } from "@/components/tasks/task-list-view"

export default function PapeleraPage() {
  return (
    <div className="flex-1 w-full h-full bg-background lg:p-4">
      <div className="max-w-4xl mx-auto space-y-6 pb-20 lg:pb-8 relative min-h-[calc(100vh-80px)] px-4 lg:px-0 pt-4 lg:pt-0">
        <div className="flex justify-between items-center mb-6 pt-2">
          <h1 className="text-[24px] font-light tracking-[-0.03em]">Papelera</h1>
        </div>
        <p className="text-muted-foreground text-sm mb-4">
          Cualquier tarea eliminada permanecerá aquí hasta ser borrada permanentemente.
        </p>
        <TaskListView status="trash" emptyText="La papelera está vacía." />
      </div>
    </div>
  )
}
