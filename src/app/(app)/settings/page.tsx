"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/utils/supabase/client"
import { Send, Calendar as CalendarIcon, RotateCw } from "lucide-react"
import { toast } from "sonner";

const ACCENT_COLORS = [
  { name: "Antigravity Blue", value: "214 94% 55%" },
  { name: "Emerald", value: "142 71% 45%" },
  { name: "Violet", value: "262 83% 58%" },
  { name: "Rose", value: "346 87% 60%" },
  { name: "Amber", value: "38 92% 50%" },
  { name: "Slate", value: "215 16% 47%" },
  { name: "Monocromático", value: "mono" }
]

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [activeModules, setActiveModules] = React.useState({
    tareas: true,
    calendario: true,
    proyectos: true,
    estudio: true,
    finanzas: true,
    despensa: true,
    recetas: true,
    habitos: true,
  })
  const [userId, setUserId] = React.useState<string | null>(null)
  const [isGoogleLinked, setIsGoogleLinked] = React.useState(false)
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [telegramChatId, setTelegramChatId] = React.useState("")
  const [isSavingTelegramId, setIsSavingTelegramId] = React.useState(false)

  // Load saved preferences on mount
  React.useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      if (data?.user) {
        setUserId(data.user.id)
        
        // Check if user has google refresh token linked
        const { data: userData } = await supabase
          .from('users')
          .select('settings, telegram_chat_id')
          .eq('id', data.user.id)
          .single()
          
        if (userData?.settings?.google_refresh_token) {
          setIsGoogleLinked(true)
        }
        if (userData?.telegram_chat_id) {
          setTelegramChatId(userData.telegram_chat_id)
        }
      }
    }
    fetchUser()

    const saved = localStorage.getItem('acrue_modules')
    if (saved) {
      setActiveModules(JSON.parse(saved))
    }
    
    // Auto-apply saved color so the preview UI matches
    const savedColor = localStorage.getItem('acrue_accent')
    if (savedColor) {
      handleColorChange(savedColor, false)
    }
  }, [])

  const handleToggle = (module: keyof typeof activeModules) => {
    const newModules = { ...activeModules, [module]: !activeModules[module] }
    setActiveModules(newModules)
    localStorage.setItem('acrue_modules', JSON.stringify(newModules))
    window.dispatchEvent(new Event('acrue_modules_changed'))
  }

  const handleColorChange = (hslValue: string, persist = true) => {
    if (hslValue === 'mono') {
      document.documentElement.classList.add('theme-mono')
      document.documentElement.style.removeProperty('--accent')
      document.documentElement.style.removeProperty('--accent-foreground')
      document.documentElement.style.removeProperty('--ring')
    } else {
      document.documentElement.classList.remove('theme-mono')
      document.documentElement.style.setProperty('--accent', `hsl(${hslValue})`)
      document.documentElement.style.setProperty('--ring', `hsl(${hslValue})`)
      document.documentElement.style.setProperty('--accent-foreground', '#FFFFFF')
    }
    
    if (persist) {
      localStorage.setItem('acrue_accent', hslValue)
    }
  }

  const handleManualSync = async () => {
    if (!userId || !isGoogleLinked) return;
    setIsSyncing(true)
    const syncToast = toast.loading('Sincronizando con Google Calendar...')
    
    try {
      const response = await fetch('/api/integrations/google-sync')
      if (response.ok) {
        toast.success('Calendario sincronizado exitosamente.', { id: syncToast })
      } else {
        throw new Error('Sync failed')
      }
    } catch (error) {
      toast.error('Ocurrió un error al sincronizar.', { id: syncToast })
      console.error(error)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSaveTelegramId = async () => {
    if (!userId) return;
    setIsSavingTelegramId(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('users')
      .update({ telegram_chat_id: telegramChatId || null })
      .eq('id', userId)
      
    if (error) {
      console.error("Telegram Link DB Error:", error)
      toast.error('Error al guardar el Chat ID de Telegram: ' + error.message)
    } else {
      toast.success('Chat ID de Telegram guardado exitosamente')
    }
    setIsSavingTelegramId(false)
  }

  return (
    <div className="flex-1 w-full h-full bg-background lg:p-4">
      <div className="max-w-2xl mx-auto space-y-8 pb-20 lg:pb-8 relative min-h-[calc(100vh-80px)] px-4 lg:px-0 pt-4 lg:pt-0">
        
        {/* Header section */}
        <div className="flex justify-between items-center mb-6 pt-2">
          <h1 className="text-[24px] font-light tracking-[-0.03em]">Ajustes (Settings)</h1>
        </div>

        {/* Modules Toggle */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Visibilidad de Módulos</h2>
          <div className="bg-card border rounded-xl overflow-hidden divide-y">
            {Object.keys(activeModules).map((mod) => (
              <div key={mod} className="flex items-center justify-between p-4">
                <Label htmlFor={`toggle-${mod}`} className="text-base capitalize cursor-pointer">
                  Módulo {mod}
                </Label>
                <Switch 
                  id={`toggle-${mod}`}
                  checked={activeModules[mod as keyof typeof activeModules]}
                  onCheckedChange={() => handleToggle(mod as keyof typeof activeModules)}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Ocultar módulos que no utilices limpiará tu barra lateral.</p>
        </section>

        {/* Appearance */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Apariencia</h2>
          
          <div className="bg-card border rounded-xl p-4 space-y-6">
            <div className="flex items-center justify-between">
              <Label className="text-base">Modo Oscuro</Label>
              <Switch 
                checked={theme === 'dark'}
                onCheckedChange={(checked: boolean) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>
            
            <div className="space-y-3 pt-4 border-t">
              <Label className="text-base block">Color de Acento Global</Label>
              <div className="flex flex-wrap gap-3">
                {ACCENT_COLORS.map((color) => (
                  <button
                    key={color.name}
                    title={color.name}
                    onClick={() => handleColorChange(color.value)}
                    className="w-10 h-10 rounded-full border-2 border-transparent focus:border-foreground/50 hover:scale-105 transition-transform shadow-sm flex items-center justify-center overflow-hidden"
                    style={{ 
                      background: color.value === 'mono' 
                        ? (theme === 'dark' ? '#FFFFFF' : '#000000')
                        : `hsl(${color.value})` 
                    }}
                    aria-label={`Select ${color.name} accent`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Integrations */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Integraciones</h2>
          
          <div className="bg-card border rounded-xl p-4 space-y-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Send className="w-4 h-4 text-[#229ED9]" />
                    Telegram Bot
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Recibe resúmenes diarios y notificaciones de tus tareas.
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled={!userId} onClick={() => {
                  if (userId) window.open(`https://t.me/AcrueBot?start=link_user_${userId}`, '_blank')
                }}>
                  {userId ? "Vincular Cuenta (Web)" : "Cargando..."}
                </Button>
              </div>
              <div className="flex items-center gap-2 w-full pt-1">
                <Input 
                  placeholder="ID de Chat de Telegram (Pruebas Locales)" 
                  value={telegramChatId} 
                  onChange={(e) => setTelegramChatId(e.target.value)} 
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
            
            <div className="flex items-center justify-between pt-4 border-t">
              <div>
                <Label className="text-base font-medium flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-[#34A853]" />
                  Google Calendar
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Sincroniza tus eventos bidireccionalmente hacia el calendario "Acrue".
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
                    <RotateCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                    Sincronizar
                  </Button>
                )}
                <Button 
                  variant={isGoogleLinked ? "secondary" : "default"} 
                  size="sm" 
                  disabled={!userId} 
                  onClick={() => {
                    if (userId) window.location.href = '/api/auth/google'
                  }}
                >
                  {userId ? (isGoogleLinked ? "Vincular de Nuevo" : "Vincular Cuenta") : "Cargando..."}
                </Button>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
