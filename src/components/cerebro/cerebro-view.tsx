"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import {
  Brain,
  CheckCircle2,
  Circle,
  ExternalLink,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react"
import { PomodoroTimer } from "@/components/focus/pomodoro-timer"
import { ModuleHeader } from "@/components/layout/module-header"
import { TabTransition } from "@/components/layout/module-transition"
import { AiThinking } from "@/components/ui/ai-thinking"
import { Button } from "@/components/ui/button"
import { getCerebroErrorMessage } from "@/lib/cerebro/errors"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc"

type CerebroTab = "focus" | "review" | "notes"

const CEREBRO_COPY: Record<CerebroTab, { title: string; description: string }> = {
  focus: {
    title: "Foco",
    description: "Bloques de estudio con tarea activa, descanso y registro de progreso.",
  },
  review: {
    title: "Repaso",
    description: "Una secuencia breve para recuperar, contrastar y cerrar un tema.",
  },
  notes: {
    title: "Apuntes",
    description: "Búsqueda semántica local sobre textos que indexaste en Acrue.",
  },
}

function getCerebroTab(tab: string | null, query: string): CerebroTab {
  if (tab === "repaso") return "review"
  if (tab === "apuntes" || query.trim()) return "notes"
  return "focus"
}

function parseManualNotes(rawText: string) {
  return rawText
    .split(/\n---+\n/g)
    .map((chunk, index) => {
      const lines = chunk.trim().split('\n').filter(Boolean)
      const firstLine = lines[0]?.trim()
      const title = firstLine && firstLine.length < 90 ? firstLine : `Nota ${index + 1}`
      const content = lines.length > 1 ? lines.slice(1).join('\n').trim() : chunk.trim()

      return {
        id: `manual-${Date.now()}-${index + 1}`,
        title,
        content,
      }
    })
    .filter((note) => note.content.length > 0)
}

function ActiveRecallPanel() {
  const [topic, setTopic] = React.useState("")
  const [goal, setGoal] = React.useState("")
  const [duration, setDuration] = React.useState("25")
  const [started, setStarted] = React.useState(false)
  const [completedReviewSteps, setCompletedReviewSteps] = React.useState<Set<number>>(() => new Set())

  const topicLabel = topic.trim() || "el tema elegido"
  const goalLabel = goal.trim() || "entenderlo sin mirar apuntes"
  const plan = React.useMemo(() => [
    {
      title: "Recuperar",
      text: `Explicá ${topicLabel} en voz alta durante 3 minutos sin abrir apuntes.`,
    },
    {
      title: "Contrastar",
      text: `Abrí tus notas y marcá solo los huecos que impidieron ${goalLabel}.`,
    },
    {
      title: "Preguntar",
      text: "Escribí 5 preguntas que te podrían tomar en un parcial o coloquio.",
    },
    {
      title: "Cerrar",
      text: `Guardá una síntesis de 6 líneas y empezá un bloque de ${duration} minutos.`,
    },
  ], [duration, goalLabel, topicLabel])
  const completedCount = completedReviewSteps.size
  const reviewProgress = Math.round((completedCount / plan.length) * 100)
  const nextStep = plan.find((_, index) => !completedReviewSteps.has(index))

  const toggleReviewStep = React.useCallback((index: number) => {
    setStarted(true)
    setCompletedReviewSteps((current) => {
      const next = new Set(current)

      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }

      return next
    })
  }, [])

  const resetReview = React.useCallback(() => {
    setStarted(false)
    setCompletedReviewSteps(new Set())
  }, [])

  const handlePrepareReview = React.useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStarted(true)
    setCompletedReviewSteps(new Set())
  }, [])

  return (
    <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <form
        className="rounded-xl border border-border/60 bg-card p-4 md:p-5"
        onSubmit={handlePrepareReview}
      >
        <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">Repaso activo</p>
        <h2 className="mt-2 text-lg font-medium text-foreground">Prepará un bloque</h2>

        <div className="mt-5 space-y-4">
          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Tema</span>
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Sistemas distribuidos"
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Meta</span>
            <input
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              placeholder="Poder explicarlo sin mirar"
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
            />
          </label>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Duración</legend>
            <div className="grid grid-cols-3 gap-2">
              {["25", "45", "60"].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={duration === value}
                  onClick={() => setDuration(value)}
                  className={cn(
                    "min-h-11 cursor-pointer rounded-lg border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    duration === value
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {value} min
                </button>
              ))}
            </div>
          </fieldset>

          <Button type="submit" className="w-full">
            {started ? "Actualizar repaso" : "Preparar repaso"}
          </Button>

          <div className="rounded-lg border border-border/60 bg-background/60 p-3">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium text-foreground">
                {completedCount} de {plan.length} pasos
              </span>
              <span className="tabular-nums text-muted-foreground">{reviewProgress}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
                style={{ width: `${reviewProgress}%` }}
              />
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {nextStep ? `Siguiente: ${nextStep.title.toLowerCase()}.` : "Repaso cerrado. Ya podés pasar al bloque de foco."}
            </p>
          </div>
        </div>
      </form>

      <div className="rounded-xl border border-border/60 bg-card p-4 md:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-foreground">Secuencia</h2>
            <p className="mt-1 text-xs text-muted-foreground">Recuperación activa antes de mirar las notas.</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={resetReview}
            disabled={!started && completedCount === 0}
            className="min-h-11 cursor-pointer rounded-lg px-3 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Reiniciar repaso
          </Button>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
              style={{ width: `${reviewProgress}%` }}
            />
          </div>
          <span className="min-w-fit text-xs font-medium tabular-nums text-muted-foreground">
            {completedCount} de {plan.length} pasos
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {plan.map((step, index) => (
            <article
              key={step.title}
              className={cn(
                "rounded-lg border p-3 transition-colors",
                completedReviewSteps.has(index)
                  ? "border-accent/30 bg-accent/5"
                  : "border-border/60 bg-background/45"
              )}
            >
              <div className="flex gap-3">
                <button
                  type="button"
                  aria-label={`Marcar paso ${index + 1} como ${completedReviewSteps.has(index) ? "pendiente" : "hecho"}`}
                  aria-pressed={completedReviewSteps.has(index)}
                  onClick={() => toggleReviewStep(index)}
                  className={cn(
                    "flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    completedReviewSteps.has(index)
                      ? "border-accent/30 bg-accent/10 text-accent"
                      : "border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {completedReviewSteps.has(index) ? (
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Circle className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                      Paso {index + 1}
                    </p>
                    {completedReviewSteps.has(index) && (
                      <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                        Hecho
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1 text-sm font-medium text-foreground">{step.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.text}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function SemanticNotesPanel({ initialQuery }: { initialQuery: string }) {
  const utils = trpc.useUtils()

  const [query, setQuery] = React.useState(initialQuery)
  const [submittedQuery, setSubmittedQuery] = React.useState(initialQuery)
  const [notebookId, setNotebookId] = React.useState("apuntes-personales")
  const [notebookTitle, setNotebookTitle] = React.useState("Apuntes personales")
  const [notesText, setNotesText] = React.useState("")
  const [deleteCandidate, setDeleteCandidate] = React.useState<string | null>(null)
  const [formError, setFormError] = React.useState<string | null>(null)

  const notebooksQuery = trpc.cerebro.notebooks.useQuery()
  const searchQuery = trpc.cerebro.search.useQuery(
    { query: submittedQuery, limit: 6 },
    { enabled: submittedQuery.trim().length > 0 }
  )
  const indexMutation = trpc.cerebro.index.useMutation({
    onSuccess: async () => {
      setNotesText("")
      setFormError(null)
      await notebooksQuery.refetch()
    },
  })
  const cleanupMutation = trpc.cerebro.cleanup.useMutation({
    onSuccess: async () => {
      setDeleteCandidate(null)
      await Promise.all([
        notebooksQuery.refetch(),
        utils.cerebro.search.invalidate(),
      ])
    },
  })

  React.useEffect(() => {
    if (!initialQuery) return
    setQuery(initialQuery)
    setSubmittedQuery(initialQuery)
  }, [initialQuery])

  const handleSearch = React.useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextQuery = query.trim()
    if (!nextQuery) return
    setSubmittedQuery(nextQuery)
  }, [query])

  const handleIndex = React.useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const notes = parseManualNotes(notesText)

    if (!notebookId.trim() || !notes.length) {
      setFormError("Agregá un cuaderno y al menos una nota.")
      return
    }

    setFormError(null)
    try {
      await indexMutation.mutateAsync({
        notebookId: notebookId.trim(),
        notebookTitle: notebookTitle.trim() || null,
        notes,
      })
    } catch (error) {
      setFormError(getCerebroErrorMessage(error, "No se pudo indexar los apuntes. Revisá Gemini e intentá de nuevo."))
    }
  }, [indexMutation, notebookId, notebookTitle, notesText])

  const isSearching = searchQuery.isFetching
  const results = searchQuery.data ?? []
  const notebooks = notebooksQuery.data ?? []

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        <form onSubmit={handleSearch} className="rounded-xl border border-border/60 bg-card p-3">
          <label className="sr-only" htmlFor="cerebro-search">Buscar en apuntes</label>
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <input
              id="cerebro-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar sistemas distribuidos, parciales, ideas..."
              className="min-h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <Button type="submit" size="sm" disabled={!query.trim() || isSearching}>
              {isSearching ? <AiThinking /> : "Buscar"}
            </Button>
          </div>
        </form>

        {isSearching && (
          <div className="rounded-xl border border-border/60 bg-card p-8">
            <AiThinking text="Buscando..." />
          </div>
        )}

        {!isSearching && submittedQuery && !results.length && !searchQuery.error && (
          <div className="rounded-xl border border-border/60 bg-card p-8 text-center">
            <Brain className="mx-auto h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
            <h2 className="mt-4 text-sm font-medium text-foreground">Sin resultados todavía.</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              Indexá apuntes o probá una consulta más concreta.
            </p>
          </div>
        )}

        {searchQuery.error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            No se pudo buscar en apuntes. Revisá que Gemini y pgvector estén disponibles.
          </div>
        )}

        <div className="space-y-3">
          {results.map((result) => (
            <article key={`${result.notebookId}-${result.noteId}`} className="rounded-xl border border-border/60 bg-card p-4 transition-colors hover:border-border">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-medium text-foreground">{result.title ?? "Nota sin título"}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {result.notebookTitle ?? result.notebookId} · {(result.similarity * 100).toFixed(0)}% relevante
                  </p>
                </div>
                {result.sourceUrl && (
                  <a
                    href={result.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Abrir nota original"
                    className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                )}
              </div>
              <p className="mt-3 text-sm leading-6 text-foreground/80">{result.snippet}</p>
            </article>
          ))}
        </div>
      </div>

      <aside className="space-y-4">
        <section className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-sm font-medium text-foreground">Indexar apuntes</h2>
          </div>
          <form onSubmit={handleIndex} className="mt-4 space-y-3">
            <label className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Cuaderno</span>
              <input
                value={notebookId}
                onChange={(event) => setNotebookId(event.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Nombre</span>
              <input
                value={notebookTitle}
                onChange={(event) => setNotebookTitle(event.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Notas</span>
              <textarea
                value={notesText}
                onChange={(event) => setNotesText(event.target.value)}
                placeholder={'Título de nota\nContenido de la nota\n---\nOtra nota'}
                className="min-h-36 w-full resize-y rounded-lg border border-input bg-background px-3 py-3 text-sm leading-6 outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/20"
              />
            </label>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button type="submit" className="w-full" disabled={indexMutation.isPending}>
              {indexMutation.isPending ? <AiThinking text="Indexando..." /> : "Indexar"}
            </Button>
          </form>
        </section>

        <section className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-foreground">Cuadernos</h2>
            {notebooksQuery.isFetching && <AiThinking />}
          </div>
          <div className="mt-4 space-y-2">
            {notebooks.map((notebook) => {
              const isConfirming = deleteCandidate === notebook.notebookId
              return (
                <div key={notebook.notebookId} className="rounded-lg border border-border/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {notebook.notebookTitle ?? notebook.notebookId}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {notebook.noteCount} notas
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={isConfirming ? "Confirmar limpieza de embeddings" : "Limpiar embeddings"}
                      onClick={() => {
                        if (!isConfirming) {
                          setDeleteCandidate(notebook.notebookId)
                          return
                        }
                        cleanupMutation.mutate({ notebookId: notebook.notebookId })
                      }}
                      className={cn(
                        "flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg transition-colors",
                        isConfirming
                          ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  {isConfirming && (
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      Volvé a tocar para limpiar embeddings de este cuaderno.
                    </p>
                  )}
                </div>
              )
            })}
            {!notebooks.length && !notebooksQuery.isFetching && (
              <p className="text-sm leading-6 text-muted-foreground">
                Todavía no hay apuntes indexados.
              </p>
            )}
          </div>
        </section>
      </aside>
    </section>
  )
}

export function CerebroView() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q") ?? ""
  const activeTab = getCerebroTab(searchParams.get("tab"), initialQuery)
  const copy = CEREBRO_COPY[activeTab]

  return (
    <>
      <ModuleHeader module="Cerebro" title={copy.title} description={copy.description} />

      <TabTransition value={activeTab}>
        {activeTab === "focus" ? (
          <PomodoroTimer variant="embedded" />
        ) : activeTab === "review" ? (
          <ActiveRecallPanel />
        ) : (
          <SemanticNotesPanel initialQuery={initialQuery} />
        )}
      </TabTransition>
    </>
  )
}
