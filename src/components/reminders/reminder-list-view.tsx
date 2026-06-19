"use client"

import * as React from "react"
import { trpc } from "@/lib/trpc"
import { Loader2, Bell, CheckCircle2, Circle } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface ReminderListItem {
  id: string
  title: string
  description: string | null
  trigger_at: string
  is_completed: boolean
}

export function ReminderListView() {
  const { data: reminders, isLoading } = trpc.reminders.list.useQuery()
  const trpcUtils = trpc.useUtils()
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null)

  const updateMutation = trpc.reminders.update.useMutation({
    onMutate: async (updatedReminder) => {
      await trpcUtils.reminders.list.cancel()
      const previousReminders = trpcUtils.reminders.list.getData()

      trpcUtils.reminders.list.setData(undefined, (old: ReminderListItem[] | undefined) => {
        if (!old) return old
        return old.map((r) => r.id === updatedReminder.id ? { ...r, ...updatedReminder } : r)
      })

      return { previousReminders }
    },
    onError: (err, newReminder, context) => {
      trpcUtils.reminders.list.setData(undefined, context?.previousReminders)
    },
    onSettled: () => {
      trpcUtils.reminders.list.invalidate()
    }
  })

  const deleteMutation = trpc.reminders.delete.useMutation({
    onMutate: async ({ id }) => {
      await trpcUtils.reminders.list.cancel()
      const previousReminders = trpcUtils.reminders.list.getData()

      trpcUtils.reminders.list.setData(undefined, (old: ReminderListItem[] | undefined) => {
        if (!old) return old
        return old.filter((r) => r.id !== id)
      })

      return { previousReminders }
    },
    onError: (err, variables, context) => {
      trpcUtils.reminders.list.setData(undefined, context?.previousReminders)
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
      {reminders.map((reminder) => {
        const isDeletePending = pendingDeleteId === reminder.id

        return (
        <div
          key={reminder.id}
          className={cn(
            "flex items-center gap-4 p-4 border rounded-xl bg-background shadow-sm transition-[background-color,border-color,box-shadow,opacity] duration-150 ease-out motion-reduce:transition-none",
            reminder.is_completed && "opacity-60 bg-muted/30"
          )}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => updateMutation.mutate({ id: reminder.id, is_completed: !reminder.is_completed })}
              aria-label={reminder.is_completed ? `Marcar ${reminder.title} como pendiente` : `Marcar ${reminder.title} como completado`}
              aria-pressed={reminder.is_completed}
              className="flex min-h-11 min-w-11 flex-shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            >
              {reminder.is_completed ? (
                <CheckCircle2 className="w-6 h-6 text-success" />
              ) : (
                <Circle className="w-6 h-6" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setPendingDeleteId(reminder.id)}
              aria-label={`Eliminar ${reminder.title}`}
              aria-expanded={isDeletePending}
              className="flex min-h-11 min-w-11 flex-shrink-0 items-center justify-center text-muted-foreground/30 transition-colors hover:text-destructive"
            >
              <Bell className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <h4 className={cn("font-medium truncate transition-[color,opacity] duration-150 ease-out motion-reduce:transition-none", reminder.is_completed && "line-through text-muted-foreground")}>
              {reminder.title}
            </h4>
            {reminder.description && (
              <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{reminder.description}</p>
            )}
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              <Bell className="w-3 h-3 mr-1" />
              {format(new Date(reminder.trigger_at), "PPp", { locale: es })}
            </div>
            {isDeletePending && (
              <div
                role="group"
                aria-label={`Confirmar eliminacion de ${reminder.title}`}
                className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-2"
              >
                <span className="px-2 text-xs text-muted-foreground">Eliminar recordatorio</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPendingDeleteId(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    deleteMutation.mutate({ id: reminder.id })
                    setPendingDeleteId(null)
                  }}
                >
                  Eliminar
                </Button>
              </div>
            )}
          </div>
        </div>
        )
      })}
    </div>
  )
}
