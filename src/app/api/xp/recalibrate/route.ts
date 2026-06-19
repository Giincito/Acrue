import { NextResponse } from 'next/server'
import { z } from 'zod'
import { assertCronRequest } from '@/lib/server/cron-auth'
import { recalibrateXP } from '@/lib/xp'
import { createServiceClient } from '@/utils/supabase/service'

const RecalibrateRequestSchema = z.object({
  userId: z.string().uuid(),
  targetXP: z.number().int().min(0),
  description: z.string().trim().min(1).max(240).optional(),
})

export async function POST(request: Request) {
  const authError = assertCronRequest(request)
  if (authError) return authError

  const body = await request.json().catch(() => null)
  const parsed = RecalibrateRequestSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Payload invalido' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const result = await recalibrateXP(
    supabase,
    parsed.data.userId,
    parsed.data.targetXP,
    parsed.data.description ?? 'Recalibracion de XP'
  )

  return NextResponse.json(result)
}
