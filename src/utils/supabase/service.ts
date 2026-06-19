import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client with the service role key.
 * Use this ONLY for background tasks, cron jobs, or the Telegram bot
 * where no user session is available.
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase service client env vars no configuradas')
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey)
}
