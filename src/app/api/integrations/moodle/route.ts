import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/service'
import { testMoodleConnection } from '@/lib/moodle/client'
import { getRequiredServerSecret } from '@/lib/server/cron-auth'

interface MoodleCredentialsRequest {
  username?: string
  password?: string
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Error interno'
}

/** POST: Store Moodle credentials (encrypted). */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json() as MoodleCredentialsRequest
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ error: 'Usuario y contraseña requeridos' }, { status: 400 })
    }

    // Test connection first
    const testResult = await testMoodleConnection(username, password)
    if (!testResult.ok) {
      return NextResponse.json({ error: testResult.error || 'No se pudo conectar con Moodle' }, { status: 400 })
    }

    const encryptionKey = getRequiredServerSecret('MOODLE_ENCRYPTION_KEY')

    // Store encrypted credentials + token
    const { error } = await supabase.rpc('store_moodle_creds', {
      p_user_id: user.id,
      p_username: username,
      p_password: password,
      p_key: encryptionKey,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Store the valid token
    const supabaseAdmin = createServiceClient()

    await supabaseAdmin
      .from('moodle_credentials')
      .update({
        token: testResult.token,
        token_expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        last_synced_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    return NextResponse.json({ ok: true, message: 'Credenciales guardadas correctamente' })
  } catch (e: unknown) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 500 })
  }
}

/** GET: Check Moodle connection status. */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const supabaseAdmin = createServiceClient()
    const { data } = await supabaseAdmin
      .from('moodle_credentials')
      .select('last_synced_at, token_expires_at')
      .eq('user_id', user.id)
      .single()

    if (!data) {
      return NextResponse.json({ connected: false })
    }

    const tokenValid = data.token_expires_at && new Date(data.token_expires_at) > new Date()

    return NextResponse.json({
      connected: true,
      lastSynced: data.last_synced_at,
      tokenValid,
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 500 })
  }
}

/** DELETE: Remove Moodle credentials. */
export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    await supabase.rpc('delete_moodle_creds', { p_user_id: user.id })

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 500 })
  }
}
