'use client'

import * as React from 'react'
import { MessageSquarePlus, X, Send, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AiThinking } from '@/components/ui/ai-thinking'
import { showUndoToast } from '@/components/ui/undo-toast'
import type { ChatMessage } from '@/types/ai'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatResponse {
  reply: string
  action?: Record<string, unknown>
}

// ── ChatBotPanel ──────────────────────────────────────────────────────────────

function ChatBotPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    { role: 'model', content: '¡Hola! Soy Acrue ✨ Puedo ayudarte a ver tus tareas, eventos, registrar gastos o crear recordatorios. ¿En qué te ayudo?' },
  ])
  const [input, setInput] = React.useState('')
  const [isThinking, setIsThinking] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  // Focus input on open
  React.useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  const sendMessage = React.useCallback(async () => {
    const text = input.trim()
    if (!text || isThinking) return

    const userMsg: ChatMessage = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsThinking(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages,
          modules: [], // all modules
        }),
      })

      const data: ChatResponse = await res.json()

      const modelMsg: ChatMessage = {
        role: 'model',
        content: data.reply ?? 'No pude generar una respuesta.',
      }
      setMessages((prev) => [...prev, modelMsg])

      // If the AI returned an action, show undo toast
      if (data.action?.action) {
        showUndoToast({
          message: `✓ Acción realizada por el asistente`,
          onUndo: () => {},
        })
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'model', content: '⚠️ Error de conexión. Intentá de nuevo.' },
      ])
    } finally {
      setIsThinking(false)
    }
  }, [input, isThinking, messages])

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }, [sendMessage])

  return (
    <div
      className="
        fixed bottom-24 right-4 md:bottom-8 md:right-8 z-50
        flex flex-col
        w-[calc(100vw-2rem)] max-w-[360px] h-[520px]
        rounded-2xl shadow-2xl
        bg-background/80 backdrop-blur-2xl
        border border-border/30
        overflow-hidden
        animate-in slide-in-from-bottom-4 fade-in duration-300
      "
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-background/60 backdrop-blur-sm shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20">
          <Bot className="h-4 w-4 text-accent" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none">Acrue AI</p>
          <p className="text-xs text-muted-foreground mt-0.5">Asistente personal</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-7 w-7 rounded-full hover:bg-muted"
          onClick={onClose}
          aria-label="Cerrar asistente"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin scrollbar-thumb-border/50">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed
                ${msg.role === 'user'
                  ? 'bg-accent text-accent-foreground rounded-br-sm'
                  : 'bg-muted/70 text-foreground rounded-bl-sm'
                }
              `}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* ── Thinking bubble ── */}
        {isThinking && (
          <div className="flex justify-start">
            <div className="bg-muted/70 rounded-2xl rounded-bl-sm px-3 py-2">
              <AiThinking text="Pensando..." />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ── */}
      <div className="shrink-0 p-3 border-t border-border/30 bg-background/60 backdrop-blur-sm">
        <div className="flex items-center gap-2 rounded-xl bg-muted/60 border border-border/30 pr-1">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribí un mensaje..."
            disabled={isThinking}
            className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
          />
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={isThinking || !input.trim()}
            className="h-8 w-8 rounded-lg shrink-0 bg-accent hover:opacity-90 disabled:opacity-40 transition-opacity"
            aria-label="Enviar mensaje"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-center text-muted-foreground mt-1.5">
          Enteresa ver tus tareas y agenda en tiempo real
        </p>
      </div>
    </div>
  )
}

// ── ChatBotFab ────────────────────────────────────────────────────────────────

export function ChatBotFab() {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      {open && <ChatBotPanel onClose={() => setOpen(false)} />}

      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-8 z-50">
        <Button
          size="icon"
          className={`
            h-14 w-14 rounded-full shadow-lg hover:shadow-xl
            hover:-translate-y-1 transition-all duration-300
            bg-background/80 border border-border/40 backdrop-blur-xl
            text-foreground ring-1 ring-black/5 dark:ring-white/10
            ${open ? 'bg-accent/50 ring-accent/30' : 'hover:bg-accent/50'}
          `}
          onClick={() => setOpen((prev) => !prev)}
          aria-label={open ? 'Cerrar Asistente AI' : 'Abrir Asistente AI'}
          aria-expanded={open}
        >
          {open
            ? <X className="h-6 w-6" />
            : <MessageSquarePlus className="h-6 w-6" />
          }
        </Button>
      </div>
    </>
  )
}
