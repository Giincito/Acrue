"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AiThinking } from "@/components/ui/ai-thinking"
import { DegradedNotice } from "@/components/shared/degraded-notice"
import { Loader2, CheckCircle2, XCircle, RefreshCw, Unplug, Wifi, WifiOff, CalendarDays, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { MoodleFeed } from "./moodle-feed"
import { trpc } from "@/lib/trpc"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import ReactMarkdown from 'react-markdown'

interface MoodleStatus {
  connected: boolean
  lastSynced?: string | null
  tokenValid?: boolean
}

function CalendarSection() {
  const { data: events, error, isLoading, refetch } = trpc.moodle.getCalendarEvents.useQuery()
  const [studyPlan, setStudyPlan] = React.useState<string | null>(null)
  
  const generatePlanMutation = trpc.moodle.generateStudyPlan.useMutation({
    onSuccess: (data) => setStudyPlan(data),
    onError: (err) => toast.error("Error al armar el plan: " + err.message)
  })

  if (isLoading) return (
    <div className="rounded-xl border bg-card/60 backdrop-blur-md p-8 flex justify-center">
      <Loader2 className="w-5 h-5 animate-spin opacity-40" />
    </div>
  )

  if (error) {
    return (
      <div className="rounded-xl border bg-card/60 p-4">
        <DegradedNotice
          title="Moodle no disponible"
          detail="No se pudieron actualizar las fechas del campus. El resto de Estudio sigue disponible."
          onRetry={() => void refetch()}
        />
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card/60 backdrop-blur-md overflow-hidden">
      <div className="p-4 border-b bg-muted/20 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-accent" /> Fechas Importantes del Campus
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Vencimientos y claves de Moodle</p>
        </div>
        {events && events.length > 0 && (
          <Button 
            size="sm" 
            onClick={() => generatePlanMutation.mutate()}
            disabled={generatePlanMutation.isPending}
            className="bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 h-8 cursor-pointer"
          >
            {generatePlanMutation.isPending ? (
              <AiThinking text="" className="mr-2 text-accent" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 mr-2" />
            )}
            {generatePlanMutation.isPending ? "Planificando..." : "Planificar estudio"}
          </Button>
        )}
      </div>

      {studyPlan && (
        <div className="p-4 bg-accent/5 dark:bg-accent/10 border-b border-accent/10 prose prose-sm dark:prose-invert max-w-none text-foreground/90">
          <div className="flex items-center gap-2 mb-2 text-accent">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-xs font-medium uppercase tracking-wider">Plan sugerido</span>
          </div>
          <ReactMarkdown>{studyPlan}</ReactMarkdown>
        </div>
      )}

      <div className="overflow-x-hidden p-2">
        {!events || events.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-xs italic">
            No hay fechas próximas registradas en el calendario de Moodle.
          </div>
        ) : (
          <div className="grid gap-2 pb-2 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((ev) => (
              <div key={ev.id} className="min-w-0 space-y-1 rounded-lg border bg-background p-3">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block truncate">
                  {ev.course_name}
                </span>
                <p className="text-sm font-medium leading-tight line-clamp-2">{ev.title}</p>
                <p className="text-xs text-accent font-medium mt-2">
                  {ev.event_date ? format(new Date(ev.event_date), "EEEE d MMM, HH:mm", { locale: es }) : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function CampusTab() {
  const [status, setStatus] = React.useState<MoodleStatus | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isDisconnecting, setIsDisconnecting] = React.useState(false)
  const [username, setUsername] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showForm, setShowForm] = React.useState(false)
  const [isMounted, setIsMounted] = React.useState(false)
  const [statusError, setStatusError] = React.useState<string | null>(null)

  // Fetch initial status
  React.useEffect(() => {
    setIsMounted(true)
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/integrations/moodle")
      const data = await res.json()
      setStatus(data)
      setStatusError(null)
    } catch {
      setStatus({ connected: false })
      setStatusError("No se pudo revisar el estado de la integración. Reintentá cuando vuelva la conexión.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const res = await fetch("/api/integrations/moodle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Error al conectar con Moodle")
        return
      }

      toast.success("Conectado a Moodle UNICEN.")
      setUsername("")
      setPassword("")
      setShowForm(false)
      await fetchStatus()
    } catch {
      toast.error("Error de red al conectar con Moodle")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    try {
      await fetch("/api/integrations/moodle", { method: "DELETE" })
      toast.success("Desconectado de Moodle")
      await fetchStatus()
    } catch {
      toast.error("Error al desconectar")
    } finally {
      setIsDisconnecting(false)
    }
  }

  if (isLoading || !isMounted) {
    return (
      <div className="flex justify-center items-center py-10 opacity-50">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Connection status card */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {status?.connected ? (
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <Wifi className="w-5 h-5 text-success" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-800/40 flex items-center justify-center">
                <WifiOff className="w-5 h-5 text-stone-500" />
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium" style={{ fontWeight: 500 }}>Campus UNICEN (Moodle)</h3>
              <p className="text-xs text-muted-foreground">
                {status?.connected ? "Conectado" : "No conectado"}
              </p>
            </div>
          </div>

          {status?.connected && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="text-muted-foreground hover:text-destructive cursor-pointer"
            >
              {isDisconnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Unplug className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>

        {/* Last sync info */}
        {status?.connected && status.lastSynced && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-3">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>
              Última sincronización:{" "}
              {new Date(status.lastSynced).toLocaleString("es-AR", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {status.tokenValid ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-success ml-auto" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-warning ml-auto" />
            )}
          </div>
        )}

        {/* Degradation notice */}
        {status?.connected && !status.tokenValid && (
          <DegradedNotice
            title="Moodle no disponible"
            detail="El token expiró. Mostrando la última sincronización hasta que vuelva a responder."
            onRetry={() => void fetchStatus()}
          />
        )}
      </div>

      {statusError ? (
        <DegradedNotice
          title="Moodle no disponible"
          detail={statusError}
          onRetry={() => void fetchStatus()}
        />
      ) : null}

      {/* Connect form */}
      {!status?.connected && (
        <>
          {!showForm ? (
            <Button
              onClick={() => setShowForm(true)}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground cursor-pointer"
            >
              Conectar con Moodle UNICEN
            </Button>
          ) : (
            <div className="rounded-xl border bg-card p-5 space-y-4">
              <h3 className="text-sm font-medium" style={{ fontWeight: 500 }}>Credenciales de Moodle UNICEN</h3>
              <p className="text-xs text-muted-foreground">
                Tus credenciales se encriptan y almacenan de forma segura. Nunca se comparten.
              </p>

              <form onSubmit={handleConnect} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Usuario</label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Tu usuario de UNICEN"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Contraseña</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tu contraseña de Moodle"
                    required
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={isSaving} className="bg-accent hover:bg-accent/90 text-accent-foreground cursor-pointer flex-1">
                    {isSaving ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Conectando...</>
                    ) : (
                      "Conectar"
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="cursor-pointer">
                    Cancelar
                  </Button>
                </div>
              </form>
            </div>
          )}
        </>
      )}

      {/* Info section (only if not connected) */}
      {!status?.connected && (
        <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">¿Qué se sincroniza?</h3>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />
              Entregas, recursos, foros y exámenes sincronizados para tareas y calendario.
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />
              Avisos del campus resumidos con contexto accionable.
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />
              Trabajos prácticos agregados como tareas en tu agenda.
            </li>
          </ul>
        </div>
      )}

      {/* Mini Calendar Section (when connected) */}
      {status?.connected && <CalendarSection />}

      {/* Moodle Feed */}
      {status?.connected && <MoodleFeed />}
    </div>
  )
}
