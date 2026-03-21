import { google } from 'googleapis'
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  
  if (!code) {
    return NextResponse.redirect(new URL('/settings?error=NoCode', req.url))
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login?next=/settings', req.url))
  }

  const host = req.headers.get('host') || 'localhost:3001'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${baseUrl}/api/auth/google/callback`
  )

  try {
    const { tokens } = await oauth2Client.getToken(code)
    
    if (tokens.refresh_token) {
      // update user settings
      const { data: userData } = await supabase.from('users').select('settings').eq('id', user.id).single()
      const currentSettings = typeof userData?.settings === 'object' && userData?.settings !== null ? userData.settings : {}
      
      await supabase.from('users').update({
        settings: { ...currentSettings, google_refresh_token: tokens.refresh_token }
      }).eq('id', user.id)
    }

    return NextResponse.redirect(new URL('/settings?google_linked=true', req.url))
  } catch (err: any) {
    console.error('Google Auth Callback Error:', err)
    return NextResponse.redirect(new URL(`/settings?error=${err.message}`, req.url))
  }
}
