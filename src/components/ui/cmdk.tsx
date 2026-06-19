'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command'
import { AiThinking } from '@/components/ui/ai-thinking'
import { showUndoToast } from '@/components/ui/undo-toast'
import { useGeminiDebounce } from '@/hooks/use-gemini-debounce'
import { trpc } from '@/lib/trpc'
import type { RouterResponse, IntentPayload } from '@/types/ai'

// ── Slash commands ────────────────────────────────────────────────────────────
const SLASH_COMMANDS = [
  { cmd: '/hoy',      label: 'Ver tareas de hoy',      route: '/hoy' },
  { cmd: '/semana',   label: 'Vista semanal',           route: '/semanal' },
  { cmd: '/gasto',    label: 'Registrar gasto rápido',  route: '/finanzas' },
  { cmd: '/tarea',    label: 'Nueva tarea',             route: '/tareas' },
  { cmd: '/nota',     label: 'Nueva nota',              route: '/cerebro' },
  { cmd: '/foco',     label: 'Activar modo foco',       route: '/foco' },
  { cmd: '/deshacer', label: 'Deshacer última acción',  route: null },
]

type CmdKState = 'idle' | 'thinking' | 'preview'

interface PreviewData {
  message: string
  preview: IntentPayload
  intent?: string
  confidence?: number
}

async function callRouter(text: string): Promise<RouterResponse> {
  const res = await fetch('/api/ai/router', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? 'Error del servidor')
  }
  return res.json()
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Error desconocido'
}

export function CmdK() {
  const router = useRouter()
  const utils = trpc.useUtils()
  const [open, setOpen] = React.useState(false)
  const [input, setInput] = React.useState('')
  const [state, setState] = React.useState<CmdKState>('idle')
  const [preview, setPreview] = React.useState<PreviewData | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  // Debounced router call — fires 400ms after user stops typing (not for slash cmds)
  const debouncedRouter = useGeminiDebounce(callRouter, 400)

  // ── Cache Invalidation Helper ────────────────────────────────────────────
  const invalidateIntent = React.useCallback(async (intentName?: string) => {
    switch (intentName) {
      case 'create_event':
        await utils.integrations?.googleCalendarEvents?.invalidate()
        break
      case 'create_task':
        await utils.tasks?.list?.invalidate()
        break
      case 'create_project':
        await utils.projects?.list?.invalidate()
        break
      case 'create_expense':
      case 'create_note':
        // Future endpoints if added
        break
      default:
        await utils.tasks?.list?.invalidate()
        await utils.reminders?.list?.invalidate()
        await utils.integrations?.googleCalendarEvents?.invalidate()
        if (utils.projects) await utils.projects.list.invalidate()
    }
  }, [utils])

  // ── Keyboard shortcut ────────────────────────────────────────────────────
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    const openCommandMenu = () => setOpen(true)
    document.addEventListener('keydown', down)
    window.addEventListener('acrue:open-cmdk', openCommandMenu)
    return () => {
      document.removeEventListener('keydown', down)
      window.removeEventListener('acrue:open-cmdk', openCommandMenu)
    }
  }, [])

  // Reset state on close
  const handleClose = React.useCallback((newOpen: boolean) => {
    if (!newOpen) {
      setInput('')
      setState('idle')
      setPreview(null)
      setError(null)
    }
    setOpen(newOpen)
  }, [])

  // ── Slash command handler ────────────────────────────────────────────────
  const handleSlashCommand = React.useCallback(async (cmd: string) => {
    if (cmd === '/deshacer') {
      handleClose(false)
      // Undo last session action stored in sessionStorage
      const lastUndoId = sessionStorage.getItem('acrue_last_undo_id')
      if (lastUndoId) {
        await fetch('/api/undo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ undoId: lastUndoId }),
        })
        sessionStorage.removeItem('acrue_last_undo_id')
        showUndoToast({ message: 'Última acción deshecha', onUndo: () => {}, duration: 2000 })
      }
      return
    }
    const match = SLASH_COMMANDS.find((s) => s.cmd === cmd)
    if (match?.route) {
      router.push(match.route)
      handleClose(false)
    }
  }, [router, handleClose])

  // ── Submit handler ───────────────────────────────────────────────────────
  const handleSubmit = React.useCallback(async (text: string) => {
    if (!text.trim()) return

    // Detect slash commands
    const slashMatch = SLASH_COMMANDS.find((s) => text.toLowerCase().startsWith(s.cmd))
    if (slashMatch) {
      await handleSlashCommand(slashMatch.cmd)
      return
    }

    if (text.toLowerCase().startsWith('@cerebro')) {
      const query = text.replace(/^@cerebro/i, '').trim()
      router.push(`/cerebro${query ? `?q=${encodeURIComponent(query)}` : ''}`)
      handleClose(false)
      return
    }

    setState('thinking')
    setError(null)
    setPreview(null)

    try {
      const result = await debouncedRouter(text)

      if (result.intent === 'search_cerebro') {
        const previewPayload = (result.preview ?? {}) as Record<string, unknown>
        const query = String(previewPayload.query ?? text).trim()
        router.push(`/cerebro?q=${encodeURIComponent(query)}`)
        handleClose(false)
        return
      }

      if (result.executed) {
        // ── High confidence: auto-saved ──────────────────────────────────
        if (result.undoId) {
          sessionStorage.setItem('acrue_last_undo_id', result.undoId)
        }
        handleClose(false)
        
        // Invalidate specific list to keep UI fast and fresh
        await invalidateIntent(result.intent)

        showUndoToast({
          message: result.message,
          undoId: result.undoId,
          onUndo: async () => {
            sessionStorage.removeItem('acrue_last_undo_id')
            await invalidateIntent(result.intent) // refresh again on undo
          },
        })
      } else {
        // ── Low confidence: show preview ─────────────────────────────────
        setState('preview')
        setPreview({
          message: result.message,
          preview: result.preview ?? {},
          intent: result.intent,
          confidence: result.confidence,
        })
      }
    } catch (err: unknown) {
      setState('idle')
      setError(getErrorMessage(err))
    }
  }, [debouncedRouter, handleSlashCommand, handleClose, invalidateIntent, router])

  // ── Confirm preview ──────────────────────────────────────────────────────
  const handleConfirmPreview = React.useCallback(async () => {
    if (!preview) return
    setState('thinking')
    // Re-submit with the preview payload including a confidence boost hint
    try {
      const confirmTextInfo = { _forceIntent: preview.intent, ...preview.preview };
      const confirmText = JSON.stringify(confirmTextInfo)
      const result = await callRouter(confirmText)
      if (result.undoId) sessionStorage.setItem('acrue_last_undo_id', result.undoId)
      handleClose(false)

      await invalidateIntent(confirmTextInfo._forceIntent)

      showUndoToast({ 
        message: result.message, 
        undoId: result.undoId, 
        onUndo: async () => { await invalidateIntent(confirmTextInfo._forceIntent) } 
      })
    } catch {
      setState('idle')
    }
  }, [preview, handleClose, invalidateIntent])

  // ── Filter slash commands when user types "/" ────────────────────────────
  const filteredSlash = input.startsWith('/')
    ? SLASH_COMMANDS.filter((s) => s.cmd.startsWith(input.toLowerCase()))
    : []
  const showSlash = filteredSlash.length > 0
  const showDefaultSuggestions = input === '' && state === 'idle'
  const previewFields = (preview?.preview ?? {}) as Record<string, unknown>

  return (
    <CommandDialog open={open} onOpenChange={handleClose}>
      {/* Input stays visible in all states */}
      <CommandInput
        placeholder={state === 'thinking' ? 'Procesando...' : 'Escribí algo o usa /comando…'}
        value={input}
        onValueChange={setInput}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && input.trim() && state === 'idle') {
            e.preventDefault()
            handleSubmit(input.trim())
          }
          if (e.key === 'Escape') handleClose(false)
        }}
        disabled={state === 'thinking'}
      />

      <CommandList>
        {/* ── AI Thinking state ── */}
        {state === 'thinking' && (
          <div className="flex items-center justify-center py-6">
            <AiThinking text="Procesando..." />
          </div>
        )}

        {/* ── Error state ── */}
        {error && state === 'idle' && (
          <div className="px-4 py-3 text-sm text-destructive flex items-center gap-2">
            {error}
          </div>
        )}

        {/* ── Preview / confirmation state ── */}
        {state === 'preview' && preview && (
          <div className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Confianza baja ({Math.round((preview.confidence ?? 0) * 100)}%) — ¿Confirmar?
            </p>
            <div className="rounded-lg border bg-card p-3 text-sm font-mono space-y-1">
              {preview.intent === 'create_task' && (
                <>
                  <div className="font-medium mb-2 uppercase tracking-wide text-xs text-primary">Nueva tarea</div>
                  {previewFields.title && (
                    <div className="flex flex-col sm:flex-row sm:gap-2">
                      <span className="text-muted-foreground min-w-[80px]">Título:</span>
                      <span className="font-medium">{String(previewFields.title)}</span>
                    </div>
                  )}
                  {previewFields.due_at && (
                    <div className="flex flex-col sm:flex-row sm:gap-2">
                      <span className="text-muted-foreground min-w-[80px]">Fecha:</span>
                      <span className="font-medium">{new Date(String(previewFields.due_at)).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                    </div>
                  )}
                  {previewFields.priority && (
                    <div className="flex flex-col sm:flex-row sm:gap-2">
                      <span className="text-muted-foreground min-w-[80px]">Prioridad:</span>
                      <span className="font-medium capitalize">{String(previewFields.priority)}</span>
                    </div>
                  )}
                </>
              )}
              {preview.intent === 'create_expense' && (
                <>
                  <div className="font-medium mb-2 uppercase tracking-wide text-xs text-primary">Nuevo gasto</div>
                  <div className="flex flex-col sm:flex-row sm:gap-2">
                    <span className="text-muted-foreground min-w-[80px]">Monto:</span>
                    <span className="font-medium font-mono">${String(previewFields.amount || previewFields.monto)}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:gap-2">
                    <span className="text-muted-foreground min-w-[80px]">Nota:</span>
                    <span className="font-medium capitalize">{String(previewFields.description || previewFields.descripcion || 'Sin nota')}</span>
                  </div>
                </>
              )}
              {/* Fallback para otras intenciones genéricas */}
              {preview.intent !== 'create_task' && preview.intent !== 'create_expense' && Object.entries(previewFields).map(([k, v]) => (
                <div key={k} className="flex flex-col sm:flex-row sm:gap-2">
                  <span className="text-muted-foreground min-w-[100px] capitalize">{k}:</span>
                  <span className="font-medium">{String(v)}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleConfirmPreview}
                className="flex-1 rounded-md bg-accent text-accent-foreground py-2 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => { setState('idle'); setPreview(null) }}
                className="rounded-md border px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* ── Slash commands suggestions ── */}
        {showSlash && state === 'idle' && (
          <CommandGroup heading="Comandos">
            {filteredSlash.map((s) => (
              <CommandItem
                key={s.cmd}
                value={s.cmd}
                onSelect={() => handleSlashCommand(s.cmd)}
                className="gap-2 cursor-pointer"
              >
                <span className="font-mono text-accent">{s.cmd}</span>
                <span className="text-muted-foreground ml-1">— {s.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* ── Default suggestions ── */}
        {showDefaultSuggestions && (
          <>
            <CommandGroup heading="Sugerencias rápidas">
              <CommandItem onSelect={() => setInput('Gasté ')} className="cursor-pointer gap-2">
                Registrar un gasto
              </CommandItem>
              <CommandItem onSelect={() => setInput('Tarea: ')} className="cursor-pointer gap-2">
                Crear una tarea
              </CommandItem>
              <CommandItem onSelect={() => setInput('Evento: ')} className="cursor-pointer gap-2">
                Agendar un evento
              </CommandItem>
              <CommandItem onSelect={() => setInput('@cerebro ')} className="cursor-pointer gap-2">
                Buscar en Cerebro
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Comandos">
              {SLASH_COMMANDS.slice(0, 4).map((s) => (
                <CommandItem
                  key={s.cmd}
                  value={s.cmd}
                  onSelect={() => handleSlashCommand(s.cmd)}
                  className="gap-2 cursor-pointer"
                >
                  <span className="font-mono text-accent">{s.cmd}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Only show "no results" in true idle+typed state */}
        {!showSlash && !showDefaultSuggestions && state === 'idle' && input && (
          <CommandEmpty>
            Presioná <kbd className="rounded border px-1 text-xs">Enter</kbd> para procesar con IA
          </CommandEmpty>
        )}
      </CommandList>
    </CommandDialog>
  )
}
