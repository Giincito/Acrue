import { NextResponse } from 'next/server'
import {
  createTasksFromGmailDigest,
  gmailExtractedTasksSchema,
} from '@/lib/google-gmail'
import { redis } from '@/lib/redis'
import { logger } from '@/lib/server/logger'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const parsed = gmailExtractedTasksSchema.safeParse(
      body && typeof body === 'object' && 'tasks' in body ? body.tasks : null
    )

    if (!parsed.success) {
      return NextResponse.json({ error: 'Tareas de Gmail inválidas' }, { status: 400 })
    }

    const tasks = parsed.data.map((task) => ({
      title: task.title,
      dueAt: task.dueAt ?? null,
      sourceEmailId: task.sourceEmailId,
    }))

    const result = await createTasksFromGmailDigest(user.id, tasks, supabase, {
      enableUndo: true,
      redis,
    })

    return NextResponse.json(result)
  } catch (error) {
    logger.error('[api/gmail/tasks] Unexpected error', error)
    return NextResponse.json({ error: 'No se pudieron agregar las tareas de Gmail' }, { status: 500 })
  }
}
