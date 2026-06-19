"use client"

import * as React from "react"
import { useTheme } from "@/components/providers/theme-provider"
import { Calendar as CalendarIcon, Music2, RotateCw, Send } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ModuleShell } from "@/components/layout/module-shell"
import { DegradedNotice } from "@/components/shared/degraded-notice"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { createClient } from "@/utils/supabase/client"

type IntegrationStatusResponse = {
  googleLinked?: boolean
  telegramChatId?: string
}

type UserSettings = {
  focus?: {
    spotifyPlaylistUrl?: string | null
    workMinutes?: number
    breakMinutes?: number
  }
}

const defaultActiveModules = {
  tareas: true,
  calendario: true,
  proyectos: true,
  estudio: true,
  finanzas: true,
  despensa: true,
  recetas: true,
  habitos: true,
}

type ModuleKey = keyof typeof defaultActiveModules

const moduleLabels: Record<ModuleKey, string> = {
  tareas: "Tareas",
  calendario: "Calendario",
  proyectos: "Proyectos",
  estudio: "Estudio",
  finanzas: "Finanzas",
  despensa: "Despensa",
  recetas: "Recetas",
  habitos: "Hábitos",
}

function readStoredModules() {
  try {
    const saved = localStorage.getItem("acrue_modules")
    if (!saved) return null

    return JSON.parse(saved) as Partial<Record<ModuleKey, boolean>>
  } catch {
    localStorage.removeItem("acrue_modules")
    return null
  }
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [activeModules, setActiveModules] = React.useState<Record<ModuleKey, boolean>>({ ...defaultActiveModules })
  const [userId, setUserId] = React.useState<string | null>(null)
  const [isGoogleLinked, setIsGoogleLinked] = React.useState(false)
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [telegramChatId, setTelegramChatId] = React.useState("")
  const [isSavingTelegramId, setIsSavingTelegramId] = React.useState(false)
  const [spotifyPlaylistUrl, setSpotifyPlaylistUrl] = React.useState("")
  const [isSavingFocusSettings, setIsSavingFocusSettings] = React.useState(false)
  const [integrationStatusError, setIntegrationStatusError] = React.useState<string | null>(null)

  const fetchUserAndIntegrationSettings = React.useCallback(async () => {
    const supabase = createClient()

    const { data } = await supabase.auth.getUser()
    if (!data?.user) return

    setUserId(data.user.id)

    try {
      const response = await fetch("/api/integrations/status")
      if (!response.ok) {
        throw new Error("No se pudo revisar el estado de las integraciones.")
      }

      const status = await response.json() as IntegrationStatusResponse
      setIsGoogleLinked(Boolean(status.googleLinked))
      setTelegramChatId(status.telegramChatId ?? "")
      setIntegrationStatusError(null)
    } catch {
      setIntegrationStatusError("No se pudo revisar el estado de Google Calendar y Telegram. Podés reintentar sin perder el resto de Ajustes.")
    }

    const { data: profile } = await supabase
      .from("users")
      .select("settings")
      .eq("id", data.user.id)
      .maybeSingle()

    const settings = profile?.settings && typeof profile.settings === "object"
      ? profile.settings as UserSettings
      : {}
    setSpotifyPlaylistUrl(settings.focus?.spotifyPlaylistUrl ?? "")
  }, [])

  React.useEffect(() => {
    void fetchUserAndIntegrationSettings()

    const savedModules = readStoredModules()
    if (savedModules) {
      setActiveModules({ ...defaultActiveModules, ...savedModules })
    }
  }, [fetchUserAndIntegrationSettings])

  const handleToggle = (module: ModuleKey) => {
    const newModules = { ...activeModules, [module]: !activeModules[module] }
    setActiveModules(newModules)
    localStorage.setItem("acrue_modules", JSON.stringify(newModules))
    window.dispatchEvent(new Event("acrue_modules_changed"))
  }

  const handleManualSync = async () => {
    if (!userId || !isGoogleLinked) return

    setIsSyncing(true)
    const syncToast = toast.loading("Sincronizando con Google Calendar...")

    try {
      const response = await fetch("/api/integrations/google-sync")
      if (!response.ok) throw new Error("No se pudo sincronizar")

      toast.success("Calendario sincronizado.", { id: syncToast })
    } catch {
      toast.error("Ocurrió un error al sincronizar.", { id: syncToast })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSaveTelegramId = async () => {
    if (!userId) return

    setIsSavingTelegramId(true)
    const supabase = createClient()
    const { error } = await supabase
      .from("users")
      .update({ telegram_chat_id: telegramChatId || null })
      .eq("id", userId)

    if (error) {
      toast.error(`Error al guardar el ID de chat de Telegram: ${error.message}`)
    } else {
      toast.success("ID de chat de Telegram guardado.")
    }

    setIsSavingTelegramId(false)
  }

  const handleSaveFocusSettings = async () => {
    if (!userId) return

    setIsSavingFocusSettings(true)
    const supabase = createClient()
    const { data: profile } = await supabase
      .from("users")
      .select("settings")
      .eq("id", userId)
      .maybeSingle()

    const currentSettings = profile?.settings && typeof profile.settings === "object"
      ? profile.settings as UserSettings
      : {}
    const nextSettings: UserSettings = {
      ...currentSettings,
      focus: {
        ...(currentSettings.focus ?? {}),
        spotifyPlaylistUrl: spotifyPlaylistUrl.trim() || null,
      },
    }

    const { error } = await supabase
      .from("users")
      .update({ settings: nextSettings })
      .eq("id", userId)

    if (error) {
      toast.error(`No se pudo guardar Spotify: ${error.message}`)
    } else {
      toast.success("Playlist de foco guardada.")
    }

    setIsSavingFocusSettings(false)
  }

  return (
    <ModuleShell width="narrow" contentClassName="space-y-8">
        <div className="flex justify-between items-center mb-6 pt-8">
          <h1 className="text-2xl font-medium text-foreground">Ajustes</h1>
        </div>

        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Visibilidad de módulos
          </h2>
          <div className="bg-card border rounded-xl overflow-hidden divide-y">
            {(Object.keys(activeModules) as ModuleKey[]).map((mod) => (
              <label
                key={mod}
                htmlFor={`toggle-${mod}`}
                className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/40"
              >
                <span className="text-base">
                  {moduleLabels[mod]}
                </span>
                <input
                  id={`toggle-${mod}`}
                  type="checkbox"
                  checked={activeModules[mod]}
                  onChange={() => handleToggle(mod)}
                  className="sr-only peer"
                />
                <span
                  aria-hidden="true"
                  className={`relative inline-flex h-[18.4px] w-8 shrink-0 items-center rounded-full border border-transparent transition-colors ${
                    activeModules[mod] ? "bg-primary" : "bg-input dark:bg-input/80"
                  }`}
                >
                  <span
                    className={`block size-4 rounded-full bg-background transition-transform ${
                      activeModules[mod]
                        ? "translate-x-[14px] dark:bg-primary-foreground"
                        : "translate-x-0 dark:bg-foreground"
                    }`}
                  />
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Ocultar módulos que no utilices limpia la barra lateral.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Apariencia
          </h2>

          <div className="bg-card border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Modo oscuro</Label>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(checked: boolean) => setTheme(checked ? "dark" : "light")}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Foco
          </h2>

          <div className="bg-card border rounded-xl p-4 space-y-3">
            <div>
              <Label className="text-base font-medium flex items-center gap-2">
                <Music2 className="w-4 h-4 text-muted-foreground" />
                Playlist de Spotify
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Se muestra solo dentro del modo foco. Si no carga, el temporizador sigue activo.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={spotifyPlaylistUrl}
                onChange={(event) => setSpotifyPlaylistUrl(event.target.value)}
                placeholder="https://open.spotify.com/playlist/..."
                className="text-sm"
              />
              <Button
                type="button"
                onClick={handleSaveFocusSettings}
                disabled={isSavingFocusSettings || !userId}
                className="sm:w-auto"
              >
                {isSavingFocusSettings ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Integraciones
          </h2>

          {integrationStatusError ? (
            <DegradedNotice
              title="Integraciones no disponibles"
              detail={integrationStatusError}
              onRetry={() => void fetchUserAndIntegrationSettings()}
            />
          ) : null}

          <div className="bg-card border rounded-xl p-4 space-y-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Send className="w-4 h-4 text-muted-foreground" />
                    Bot de Telegram
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Recibe resúmenes diarios y notificaciones de tus tareas.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!userId}
                  onClick={() => {
                    if (!userId) return

                    window.open(
                      `https://t.me/AcrueBot?start=link_user_${userId}`,
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }}
                >
                  {userId ? "Vincular cuenta" : "Cargando..."}
                </Button>
              </div>
              <div className="flex items-center gap-2 w-full pt-1">
                <Input
                  placeholder="ID de chat de Telegram (pruebas locales)"
                  value={telegramChatId}
                  onChange={(event) => setTelegramChatId(event.target.value)}
                  className="h-8 text-xs bg-transparent"
                />
                <Button
                  disabled={isSavingTelegramId || !userId}
                  onClick={handleSaveTelegramId}
                  size="sm"
                  className="h-8 text-xs"
                >
                  Guardar ID manual
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 pt-4 border-t">
              <div>
                <Label className="text-base font-medium flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                  Google Calendar y Gmail
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Sincroniza tus eventos hacia el calendario &quot;Acrue&quot;. Gmail se usa para armar el digest.
                </p>
              </div>
              <div className="flex gap-2">
                {isGoogleLinked && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManualSync}
                    disabled={isSyncing}
                  >
                    <RotateCw className={`w-4 h-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                    Sincronizar
                  </Button>
                )}
                <Button
                  variant={isGoogleLinked ? "secondary" : "default"}
                  size="sm"
                  disabled={!userId}
                  onClick={() => {
                    if (userId) window.location.href = "/api/auth/google"
                  }}
                >
                  {userId ? (isGoogleLinked ? "Vincular de nuevo" : "Vincular cuenta") : "Cargando..."}
                </Button>
              </div>
            </div>
          </div>
        </section>
    </ModuleShell>
  )
}
