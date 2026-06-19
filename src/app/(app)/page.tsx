import { redirect } from 'next/navigation'
import { InicioModule } from '@/components/inicio/inicio-module'
import {
  buildDailyBriefing,
  buildWeeklySummary,
} from '@/lib/gemini/briefing'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/service'

export const dynamic = 'force-dynamic'

export default async function InicioPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const serviceClient = createServiceClient()
  const [briefing, weeklySummary] = await Promise.all([
    buildDailyBriefing({
      userId: user.id,
      supabase: serviceClient,
    }),
    buildWeeklySummary({
      userId: user.id,
      supabase: serviceClient,
    }),
  ])

  return <InicioModule briefing={briefing} weeklySummary={weeklySummary} />
}
