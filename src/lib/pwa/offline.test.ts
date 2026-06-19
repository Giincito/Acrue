import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  canRegisterServiceWorker,
  getOfflinePrecacheUrls,
  SERVICE_WORKER_PATH,
  shouldUnregisterServiceWorker,
} from './offline'

describe('PWA offline foundation', () => {
  it('pre-caches the PRD critical routes and PWA assets', () => {
    const urls = getOfflinePrecacheUrls()

    expect(urls).toEqual([
      '/',
      '/hoy',
      '/tareas',
      '/tareas?tab=today',
      '/calendario',
      '/manifest.webmanifest',
      '/icons/icon-192.png',
      '/icons/icon-512.png',
      '/icons/icon-180.png',
      '/icons/icon-167.png',
    ])
    expect(new Set(urls).size).toBe(urls.length)
  })

  it('registers the service worker only when the browser can safely run it', () => {
    expect(canRegisterServiceWorker({
      hasServiceWorker: true,
      hostname: 'acrue.vercel.app',
      nodeEnv: 'production',
      protocol: 'https:',
    })).toBe(true)

    expect(canRegisterServiceWorker({
      hasServiceWorker: true,
      hostname: 'localhost',
      nodeEnv: 'production',
      protocol: 'http:',
    })).toBe(true)

    expect(canRegisterServiceWorker({
      hasServiceWorker: true,
      hostname: 'acrue.test',
      nodeEnv: 'development',
      protocol: 'https:',
    })).toBe(false)

    expect(canRegisterServiceWorker({
      hasServiceWorker: false,
      hostname: 'acrue.vercel.app',
      nodeEnv: 'production',
      protocol: 'https:',
    })).toBe(false)

    expect(canRegisterServiceWorker({
      hasServiceWorker: true,
      hostname: 'acrue.test',
      nodeEnv: 'production',
      protocol: 'http:',
    })).toBe(false)
  })

  it('unregisters stale service workers outside safe production contexts', () => {
    expect(shouldUnregisterServiceWorker({
      hasServiceWorker: true,
      hostname: 'localhost',
      nodeEnv: 'development',
      protocol: 'http:',
    })).toBe(true)

    expect(shouldUnregisterServiceWorker({
      hasServiceWorker: true,
      hostname: 'acrue.vercel.app',
      nodeEnv: 'production',
      protocol: 'https:',
    })).toBe(false)
  })

  it('ships a service worker with app-shell cache and route-scoped navigation fallback', () => {
    const worker = readFileSync(join(process.cwd(), 'public/sw.js'), 'utf8')

    for (const url of getOfflinePrecacheUrls()) {
      expect(worker).toContain(`'${url}'`)
    }

    expect(SERVICE_WORKER_PATH).toBe('/sw.js')
    expect(worker).toContain("self.addEventListener('install'")
    expect(worker).toContain("self.addEventListener('activate'")
    expect(worker).toContain("self.addEventListener('fetch'")
    expect(worker).toContain("event.request.mode === 'navigate'")
    expect(worker).toContain("acrue-offline-v6")
    expect(worker).toContain("isVersionedBuildAssetRequest")
    expect(worker).toContain("event.request.cache === 'only-if-cached'")
    expect(worker).toContain("cacheFirstBuildAsset")
    expect(worker).toContain("url.pathname.startsWith('/_next/static/')")
    expect(worker).toContain("matchCachedNavigation")
    expect(worker).toContain("ignoreVary: true")
    expect(worker).toContain("cacheResponseWithoutVary")
    expect(worker).toContain("headers.delete('vary')")
    expect(worker).toContain("cache.match(request, NAVIGATION_MATCH_OPTIONS)")
    expect(worker).toContain("Response.error()")
    expect(worker).not.toContain("caches.match('/tareas')")
    expect(worker).not.toContain("networkOnlyBuildAsset")
  })
})
