'use client'

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const updateOnlineState = () => setIsOffline(!navigator.onLine)

    updateOnlineState()
    window.addEventListener('online', updateOnlineState)
    window.addEventListener('offline', updateOnlineState)

    return () => {
      window.removeEventListener('online', updateOnlineState)
      window.removeEventListener('offline', updateOnlineState)
    }
  }, [])

  if (!isOffline) {
    return null
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-20 z-[60] flex items-center gap-2 rounded-lg border border-border/60 bg-background/90 px-3 py-2 text-xs font-medium text-muted-foreground shadow-lg backdrop-blur-md md:bottom-6 md:left-auto md:right-6 md:max-w-sm"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>Sin conexión. Las vistas críticas siguen disponibles con datos cacheados.</span>
    </div>
  )
}
