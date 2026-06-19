import { google } from 'googleapis'
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { withFallback } from '@/lib/integrations/resilience'
import { logger } from '@/lib/server/logger'
import { createServiceClient } from '@/utils/supabase/service'
import { getGoogleOAuthRedirectUri } from '@/lib/google-oauth'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  
  if (!code) {
    return NextResponse.redirect(new URL('/configuracion?error=NoCode', req.url))
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login?next=/configuracion', req.url))
  }

  const redirectUri = getGoogleOAuthRedirectUri(req)

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  )

  try {
    const tokenResult = await withFallback(
      async () => oauth2Client.getToken(code),
      null
    )

    if (!tokenResult.data) {
      throw new Error(tokenResult.error ?? 'No se pudo vincular Google')
    }

    const { tokens } = tokenResult.data
    
    if (tokens.refresh_token) {
      const adminSupabase = createServiceClient()
      await adminSupabase.from('google_integrations').upsert({
        user_id: user.id,
        refresh_token: tokens.refresh_token,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
    }

    return NextResponse.redirect(new URL('/configuracion?google_linked=true', req.url))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno'
    logger.error('Google Auth Callback Error:', err)
    return NextResponse.redirect(new URL(`/configuracion?error=${encodeURIComponent(message)}`, req.url))
  }
}
