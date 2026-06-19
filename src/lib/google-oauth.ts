function normalizeOrigin(origin: string) {
  return origin.trim().replace(/\/+$/, '')
}

function getForwardedValue(value: string | null) {
  return value?.split(',')[0]?.trim() || null
}

function isLocalHost(host: string) {
  const hostname = host.replace(/^\[/, '').replace(/\]$/, '').split(':')[0]?.toLowerCase()
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

export function getGoogleOAuthRedirectUri(req: Request) {
  const url = new URL(req.url)
  const host = getForwardedValue(req.headers.get('x-forwarded-host')) ?? req.headers.get('host') ?? url.host
  const local = isLocalHost(host)
  const protocol = local
    ? 'http'
    : getForwardedValue(req.headers.get('x-forwarded-proto')) ?? url.protocol.replace(':', '')
  const requestOrigin = normalizeOrigin(`${protocol}://${host}`)
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL
    ? normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL)
    : null
  const origin = local ? requestOrigin : configuredOrigin ?? requestOrigin

  return `${origin}/api/auth/google/callback`
}
