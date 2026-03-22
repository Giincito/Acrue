'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command'
import { AiThinking } from '@/components/ui/ai-thinking'
import { showUndoToast } from '@/components/ui/undo-toast'
import { useGeminiDebounce } from '@/hooks/use-gemini-debounce'
import type { RouterResponse, IntentPayload } from '@/types/ai'

// ── Slash commands ────────────────────────────────────────────────────────────
const SLASH_COMMANDS = [
  { cmd: '/hoy',      label: 'Ver tareas de hoy',      icon: '📅', route: '/hoy' },
  { cmd: '/semana',   label: 'Vista semanal',           icon: '🗓', route: '/semanal' },
  { cmd: '/gasto',    label: 'Registrar gasto rápido',  icon: '💸', route: '/finanzas' },
  { cmd: '/tarea',    label: 'Nueva tarea',             icon: '✅', route: '/tareas' },
  { cmd: '/nota',     label: 'Nueva nota',              icon: '📝', route: '/cerebro' },
  { cmd: '/foco',     label: 'Activar modo foco',       icon: '🎯', route: '/foco' },
  { cmd: '/deshacer', label: 'Deshacer última acción',  icon: '↩️', route: null },
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

export function CmdK() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [input, setInput] = React.useState('')
  const [state, setState] = React.useState<CmdKState>('idle')
  const [preview, setPreview] = React.useState<PreviewData | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  // Debounced router call — fires 400ms after user stops typing (not for slash cmds)
  const debouncedRouter = useGeminiDebounce(callRouter, 400)

  // ── Keyboard shortcut ────────────────────────────────────────────────────
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
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

    setState('thinking')
    setError(null)
    setPreview(null)

    try {
      const result = await debouncedRouter(text)

      if (result.executed) {
        // ── High confidence: auto-saved ──────────────────────────────────
        if (result.undoId) {
          sessionStorage.setItem('acrue_last_undo_id', result.undoId)
        }
        handleClose(false)
        showUndoToast({
          message: result.message,
          undoId: result.undoId,
          onUndo: () => {
            sessionStorage.removeItem('acrue_last_undo_id')
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
    } catch (err: any) {
      setState('idle')
      setError(err.message ?? 'Error desconocido')
    }
  }, [debouncedRouter, handleSlashCommand, handleClose])

  // ── Confirm preview ──────────────────────────────────────────────────────
  const handleConfirmPreview = React.useCallback(async () => {
    if (!preview) return
    setState('thinking')
    // Re-submit with the preview payload including a confidence boost hint
    try {
      const confirmText = JSON.stringify({ _forceIntent: preview.intent, ...preview.preview })
      const result = await callRouter(confirmText)
      if (result.undoId) sessionStorage.setItem('acrue_last_undo_id', result.undoId)
      handleClose(false)
      showUndoToast({ message: result.message, undoId: result.undoId, onUndo: () => {} })
    } catch {
      setState('idle')
    }
  }, [preview, handleClose])

  // ── Filter slash commands when user types "/" ────────────────────────────
  const filteredSlash = input.startsWith('/')
    ? SLASH_COMMANDS.filter((s) => s.cmd.startsWith(input.toLowerCase()))
    : []
  const showSlash = filteredSlash.length > 0
  const showDefaultSuggestions = input === '' && state === 'idle'

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
            <AiThinking text="Procesando con IA..." />
          </div>
        )}

        {/* ── Error state ── */}
        {error && state === 'idle' && (
          <div className="px-4 py-3 text-sm text-destructive flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* ── Preview / confirmation state ── */}
        {state === 'preview' && preview && (
          <div className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Confianza baja ({Math.round((preview.confidence ?? 0) * 100)}%) — ¿Confirmar?
            </p>
            <div className="rounded-lg border bg-card p-3 text-sm font-mono space-y-1">
              {Object.entries(preview.preview).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-muted-foreground min-w-[100px]">{k}:</span>
                  <span className="font-medium">{String(v)}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleConfirmPreview}
                className="flex-1 rounded-md bg-accent text-accent-foreground py-2 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Confirmar ✓
              </button>
              <button
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
                <span className="text-lg">{s.icon}</span>
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
                <span>💸</span> Registrar un gasto
              </CommandItem>
              <CommandItem onSelect={() => setInput('Tarea: ')} className="cursor-pointer gap-2">
                <span>✅</span> Crear una tarea
              </CommandItem>
              <CommandItem onSelect={() => setInput('Evento: ')} className="cursor-pointer gap-2">
                <span>📅</span> Agendar un evento
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
                  <span>{s.icon}</span>
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
