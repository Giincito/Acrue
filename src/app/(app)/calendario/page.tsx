"use client"

import * as React from "react"
import { CalendarView } from "@/components/calendar/calendar-view"

export default function CalendarPage() {
  return (
    <div className="flex-1 w-full h-full bg-background lg:p-4">
      <div className="max-w-5xl mx-auto space-y-6 pb-20 lg:pb-8 relative min-h-[calc(100vh-80px)] px-4 lg:px-0 pt-4 lg:pt-0">
        
        {/* Header section */}
        <div className="flex justify-between items-center mb-6 pt-2">
          <h1 className="text-3xl font-bold tracking-tight">Calendario</h1>
        </div>

        {/* Content */}
        <div className="mt-4">
          <CalendarView />
        </div>
      </div>
    </div>
  )
}
