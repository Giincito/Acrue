'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AiThinking } from '@/components/ui/ai-thinking'
import { showUndoToast } from '@/components/ui/undo-toast'
import type { GmailExtractedTask } from '@/lib/google-gmail'

type GmailTaskImportResponse = {
  created: number
  skipped: number
  createdTasks: Array<{
    title: string
    recordId: string
    undoId?: string
  }>
  error?: string
}

type ImportState =
  | { status: 'idle' }
  | { status: 'importing' }
  | { status: 'done'; created: number; skipped: number }
  | { status: 'error'; message: string }

export function GmailTaskImporter({ tasks }: { tasks: GmailExtractedTask[] }) {
  const router = useRouter()
  const [state, setState] = React.useState<ImportState>({ status: 'idle' })
  const taskKey = React.useMemo(
    () => tasks.map((task) => task.sourceEmailId).sort().join('|'),
    [tasks]
  )

  const importTasks = React.useCallback(async (force = false) => {
    if (!tasks.length || !taskKey) return

    const storageKey = `acrue:gmail-task-import:${taskKey}`
    if (!force && sessionStorage.getItem(storageKey)) {
      setState({ status: 'done', created: 0, skipped: tasks.length })
      return
    }

    setState({ status: 'importing' })

    try {
      const response = await fetch('/api/gmail/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks }),
      })
      const data = await response.json() as GmailTaskImportResponse

      if (!response.ok) {
        throw new Error(data.error ?? 'No se pudieron agregar las tareas.')
      }

      sessionStorage.setItem(storageKey, '1')

      for (const createdTask of data.createdTasks) {
        if (createdTask.undoId) {
          sessionStorage.setItem('acrue_last_undo_id', createdTask.undoId)
        }

        showUndoToast({
          message: `Tarea creada desde Gmail: ${createdTask.title}`,
          undoId: createdTask.undoId,
          onUndo: () => {
            router.refresh()
          },
        })
      }

      setState({ status: 'done', created: data.created, skipped: data.skipped })
      router.refresh()
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : 'No se pudieron agregar las tareas.',
      })
    }
  }, [router, taskKey, tasks])

  React.useEffect(() => {
    void importTasks()
  }, [importTasks])

  if (!tasks.length) return null

  if (state.status === 'importing') {
    return (
      <div role="status" className="mt-3 flex min-h-11 items-center text-sm text-muted-foreground">
        <AiThinking text="Agregando tareas..." />
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="mt-3 flex flex-col gap-3 text-sm leading-6 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>{state.message}</span>
        <button
          type="button"
          onClick={() => void importTasks(true)}
          className="min-h-11 rounded-md border border-border px-3 text-sm font-medium text-foreground transition-[background-color,border-color] duration-150 ease-out hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (state.status === 'done') {
    const message = state.created > 0
      ? `${state.created} tareas agregadas desde Gmail.`
      : `${state.skipped || tasks.length} tareas ya estaban en Tareas.`

    return (
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {message}{' '}
        <Link href="/tareas" className="cursor-pointer font-medium text-accent underline-offset-4 hover:underline">
          Ver Tareas
        </Link>
      </p>
    )
  }

  return null
}
