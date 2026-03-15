"use client"

import * as React from "react"
import { ReminderListView } from "@/components/reminders/reminder-list-view"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function RemindersPage() {
  return (
    <div className="flex-1 w-full h-full bg-background lg:p-4">
      <div className="max-w-3xl mx-auto space-y-6 pb-20 lg:pb-8 relative min-h-[calc(100vh-80px)] px-4 lg:px-0 pt-4 lg:pt-0">
        
        {/* Header section */}
        <div className="flex justify-between items-center mb-6 pt-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Recordatorios</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Notificaciones rápidas y alertas puntuales.
            </p>
          </div>
          <Button size="icon" className="rounded-full shadow-md bg-[#2282fa] text-white hover:bg-[#2282fa]/90 lg:w-auto lg:px-4 lg:rounded-md h-12 w-12 lg:h-10">
            <Plus className="w-6 h-6 lg:w-5 lg:h-5 lg:mr-2" />
            <span className="hidden lg:inline">Añadir</span>
          </Button>
        </div>

        {/* Content */}
        <div className="mt-6">
          <ReminderListView />
        </div>
      </div>
    </div>
  )
}
