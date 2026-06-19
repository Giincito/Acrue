'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import {
  createIndexedDbOfflineActionStore,
  OFFLINE_ACTION_QUEUED_EVENT,
  syncQueuedOfflineActions,
} from '@/lib/pwa/offline-actions'

export function OfflineSyncStatus() {
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    let disposed = false
    let store: ReturnType<typeof createIndexedDbOfflineActionStore>

    try {
      store = createIndexedDbOfflineActionStore()
    } catch {
      return
    }

    const refreshPendingCount = async () => {
      const actions = await store.list()
      if (!disposed) {
        setPendingCount(actions.length)
      }
      return actions.length
    }

    const runSync = async () => {
      const count = await refreshPendingCount()
      if (count === 0 || !navigator.onLine) {
        return
      }

      setIsSyncing(true)
      try {
        const result = await syncQueuedOfflineActions(store, fetch)
        if (result.synced > 0 && result.failed === 0) {
          toast.success('Cambios sincronizados')
        } else if (result.failed > 0) {
          toast.error('Algunos cambios siguen pendientes')
        }
      } catch {
        toast.error('No se pudo sincronizar', {
          description: 'Se reintentará cuando vuelva la conexión.',
        })
      } finally {
        if (!disposed) {
          setIsSyncing(false)
          await refreshPendingCount()
        }
      }
    }

    const onQueued = () => {
      void refreshPendingCount()
    }
    const onOnline = () => {
      void runSync()
    }

    window.addEventListener(OFFLINE_ACTION_QUEUED_EVENT, onQueued)
    window.addEventListener('online', onOnline)
    void runSync()

    return () => {
      disposed = true
      window.removeEventListener(OFFLINE_ACTION_QUEUED_EVENT, onQueued)
      window.removeEventListener('online', onOnline)
    }
  }, [])

  if (pendingCount === 0 && !isSyncing) {
    return null
  }

  const label = isSyncing
    ? 'Sincronizando cambios pendientes'
    : `${pendingCount} ${pendingCount === 1 ? 'cambio pendiente' : 'cambios pendientes'} de sincronizar`

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-32 z-[60] flex items-center gap-2 rounded-lg border border-border/60 bg-background/90 px-3 py-2 text-xs font-medium text-muted-foreground shadow-lg backdrop-blur-md md:bottom-20 md:left-auto md:right-6 md:max-w-sm"
    >
      <RefreshCw className={`h-4 w-4 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
