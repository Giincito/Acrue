export const SERVICE_WORKER_PATH = '/sw.js'

const CRITICAL_OFFLINE_ROUTES = [
  '/',
  '/hoy',
  '/tareas',
  '/tareas?tab=today',
  '/calendario',
] as const

const PWA_ASSET_URLS = [
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-180.png',
  '/icons/icon-167.png',
] as const

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]'])

export type ServiceWorkerRuntime = {
  hasServiceWorker: boolean
  hostname: string
  nodeEnv: string
  protocol: string
}

export function getOfflinePrecacheUrls(): string[] {
  return [...CRITICAL_OFFLINE_ROUTES, ...PWA_ASSET_URLS]
}

export function canRegisterServiceWorker(runtime: ServiceWorkerRuntime): boolean {
  if (runtime.nodeEnv !== 'production' || !runtime.hasServiceWorker) {
    return false
  }

  if (runtime.protocol === 'https:') {
    return true
  }

  return runtime.protocol === 'http:' && LOCAL_HOSTNAMES.has(runtime.hostname)
}

export function shouldUnregisterServiceWorker(runtime: ServiceWorkerRuntime): boolean {
  return runtime.hasServiceWorker && !canRegisterServiceWorker(runtime)
}
