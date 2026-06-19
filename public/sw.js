const CACHE_NAME = 'acrue-offline-v6'
const NAVIGATION_MATCH_OPTIONS = { ignoreVary: true }

const APP_SHELL_URLS = [
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
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.all(
          APP_SHELL_URLS.map(async (url) => {
            try {
              const response = await fetch(new Request(url, { cache: 'reload' }))
              if (response.ok) {
                await cacheResponseWithoutVary(cache, url, response)
              }
            } catch {
              return undefined
            }
          })
        )
      )
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return
  }

  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) {
    return
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(event.request))
    return
  }

  if (isVersionedBuildAssetRequest(event.request)) {
    if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') {
      return
    }

    event.respondWith(cacheFirstBuildAsset(event.request))
    return
  }

  if (isAppShellRequest(url)) {
    event.respondWith(cacheFirst(event.request))
  }
})

function isVersionedBuildAssetRequest(request) {
  const url = new URL(request.url)
  return url.pathname.startsWith('/_next/static/')
}

function isAppShellRequest(url) {
  return APP_SHELL_URLS.includes(`${url.pathname}${url.search}`) || APP_SHELL_URLS.includes(url.pathname)
}

async function cacheFirstBuildAsset(request) {
  return cacheFirst(request)
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME)

  try {
    const response = await fetch(request)
    if (response.ok) {
      await cacheResponseWithoutVary(cache, request, response.clone())
    }
    return response
  } catch {
    return (await matchCachedNavigation(cache, request)) || Response.error()
  }
}

async function matchCachedNavigation(cache, request) {
  const url = new URL(request.url)

  return (
    (await cache.match(request, NAVIGATION_MATCH_OPTIONS)) ||
    (await cache.match(`${url.pathname}${url.search}`, NAVIGATION_MATCH_OPTIONS)) ||
    (await cache.match(url.pathname, NAVIGATION_MATCH_OPTIONS))
  )
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)

  if (cached) {
    return cached
  }

  const response = await fetch(request)
  if (response.ok) {
    await cacheResponseWithoutVary(cache, request, response.clone())
  }
  return response
}

async function cacheResponseWithoutVary(cache, request, response) {
  const headers = new Headers(response.headers)
  headers.delete('vary')

  await cache.put(request, new Response(await response.blob(), {
    headers,
    status: response.status,
    statusText: response.statusText,
  }))
}
