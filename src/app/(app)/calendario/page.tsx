"use client"

import * as React from "react"
import { CalendarView } from "@/components/calendar/calendar-view"
import { ModuleShell } from "@/components/layout/module-shell"

export default function CalendarPage() {
  return (
    <ModuleShell width="wide">
        {/* Content */}
        <div className="mt-4">
          <React.Suspense fallback={
            <div className="flex items-center justify-center p-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          }>
            <CalendarView />
          </React.Suspense>
        </div>
    </ModuleShell>
  )
}
