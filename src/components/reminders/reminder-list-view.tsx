"use client"

import * as React from "react"
import { trpc } from "@/lib/trpc"
import { Loader2, Bell, CheckCircle2, Circle } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export function ReminderListView() {
  const { data: reminders, isLoading } = trpc.reminders.list.useQuery()
  const trpcUtils = trpc.useUtils()
  
  const updateMutation = trpc.reminders.update.useMutation({
    onMutate: async (updatedReminder) => {
      await trpcUtils.reminders.list.cancel()
      const previousReminders = trpcUtils.reminders.list.getData()
      
      trpcUtils.reminders.list.setQueryData(undefined, (old) => {
        if (!old) return old
        return old.map(r => r.id === updatedReminder.id ? { ...r, ...updatedReminder } : r)
      })
      
      return { previousReminders }
    },
    onError: (err, newReminder, context) => {
      trpcUtils.reminders.list.setQueryData(undefined, context?.previousReminders)
    },
    onSettled: () => {
      trpcUtils.reminders.list.invalidate()
    }
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10 opacity-50">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  if (!reminders || reminders.length === 0) {
    return (
      <div className="text-center py-12 px-4 border border-dashed rounded-lg bg-muted/20">
        <Bell className="w-8 h-8 mx-auto text-muted-foreground opacity-50 mb-3" />
        <p className="text-sm text-muted-foreground">No tienes recordatorios activos.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {reminders.map((reminder) => (
        <div 
          key={reminder.id}
          className={cn(
            "flex items-center gap-4 p-4 border rounded-xl bg-background shadow-sm transition-all",
            reminder.is_completed && "opacity-60 bg-muted/30"
          )}
        >
          <button 
            onClick={() => updateMutation.mutate({ id: reminder.id, is_completed: !reminder.is_completed })}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            {reminder.is_completed ? (
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            ) : (
              <Circle className="w-6 h-6" />
            )}
          </button>
          
          <div className="flex-1 min-w-0">
            <h4 className={cn("font-medium truncate transition-all", reminder.is_completed && "line-through text-muted-foreground")}>
              {reminder.title}
            </h4>
            {reminder.description && (
              <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{reminder.description}</p>
            )}
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              <Bell className="w-3 h-3 mr-1" />
              {format(new Date(reminder.trigger_at), "PPp", { locale: es })}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
