'use client'

import { useEffect } from 'react'
import {
  canRegisterServiceWorker,
  SERVICE_WORKER_PATH,
  shouldUnregisterServiceWorker,
} from '@/lib/pwa/offline'

async function unregisterStaleServiceWorkers() {
  const registrations = await navigator.serviceWorker.getRegistrations()

  await Promise.all(
    registrations
      .filter((registration) => registration.active?.scriptURL.endsWith(SERVICE_WORKER_PATH))
      .map((registration) => registration.unregister())
  )

  if ('caches' in window) {
    const cacheNames = await caches.keys()
    await Promise.all(
      cacheNames
        .filter((cacheName) => cacheName.startsWith('acrue-offline-'))
        .map((cacheName) => caches.delete(cacheName))
    )
  }
}

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return
    }

    const shouldRegister = canRegisterServiceWorker({
      hasServiceWorker: 'serviceWorker' in navigator,
      hostname: window.location.hostname,
      nodeEnv: process.env.NODE_ENV,
      protocol: window.location.protocol,
    })

    if (shouldUnregisterServiceWorker({
      hasServiceWorker: 'serviceWorker' in navigator,
      hostname: window.location.hostname,
      nodeEnv: process.env.NODE_ENV,
      protocol: window.location.protocol,
    })) {
      void unregisterStaleServiceWorkers().catch(() => undefined)
      return
    }

    if (!shouldRegister) {
      return
    }

    const register = () => {
      void navigator.serviceWorker
        .register(SERVICE_WORKER_PATH, { updateViaCache: 'none' })
        .then((registration) => registration.update())
        .catch(() => undefined)
    }

    if (document.readyState === 'complete') {
      register()
      return
    }

    window.addEventListener('load', register, { once: true })
    return () => window.removeEventListener('load', register)
  }, [])

  return null
}
