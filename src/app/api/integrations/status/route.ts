import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/service'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('users')
    .select('telegram_chat_id')
    .eq('id', user.id)
    .single()

  if (error) {
    return NextResponse.json({ error: 'No se pudo cargar la configuración' }, { status: 500 })
  }

  const adminSupabase = createServiceClient()
  const { data: googleIntegration, error: googleError } = await adminSupabase
    .from('google_integrations')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (googleError) {
    return NextResponse.json({ error: 'No se pudo cargar la integración de Google' }, { status: 500 })
  }

  return NextResponse.json({
    googleLinked: Boolean(googleIntegration),
    telegramChatId: data?.telegram_chat_id ?? '',
  })
}
