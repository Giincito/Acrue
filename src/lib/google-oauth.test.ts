import { afterEach, describe, expect, it } from 'vitest'

describe('Google OAuth redirect URI', () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl
  })

  it('uses the local request origin instead of NEXT_PUBLIC_SITE_URL during local development', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://acrue.app'
    const { getGoogleOAuthRedirectUri } = await import('./google-oauth')

    const redirectUri = getGoogleOAuthRedirectUri(
      new Request('http://localhost:3000/api/auth/google', {
        headers: { host: 'localhost:3000' },
      })
    )

    expect(redirectUri).toBe('http://localhost:3000/api/auth/google/callback')
  })

  it('uses NEXT_PUBLIC_SITE_URL outside local development', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://acrue.app/'
    const { getGoogleOAuthRedirectUri } = await import('./google-oauth')

    const redirectUri = getGoogleOAuthRedirectUri(
      new Request('https://preview.example.com/api/auth/google', {
        headers: { host: 'preview.example.com' },
      })
    )

    expect(redirectUri).toBe('https://acrue.app/api/auth/google/callback')
  })
})
