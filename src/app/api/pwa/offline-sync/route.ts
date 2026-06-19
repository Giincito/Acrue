import { NextResponse } from 'next/server'
import { z } from 'zod'
import { applyQueuedOfflineActions, type OfflineSyncCaller } from '@/lib/pwa/offline-sync'
import { appRouter } from '@/server/routers/_app'
import { createContext } from '@/server/trpc'
import { CreateExpenseSchema } from '@/server/schema/finance'
import { CreateTaskSchema } from '@/server/schema/task'

const QueuedOfflineActionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['tasks.create', 'expenses.create']),
  payload: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  attempts: z.number().int().min(0),
  lastError: z.string().optional(),
})

const OfflineSyncRequestSchema = z.object({
  actions: z.array(QueuedOfflineActionSchema).max(50),
})

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = OfflineSyncRequestSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Solicitud offline invalida' }, { status: 400 })
  }

  const context = await createContext({ req })
  if (!context.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const caller = appRouter.createCaller(context)
  const syncCaller: OfflineSyncCaller = {
    tasks: {
      create: (input) => caller.tasks.create(CreateTaskSchema.parse(input)),
    },
    expenses: {
      create: (input) => caller.expenses.create(CreateExpenseSchema.parse(input)),
    },
  }

  const results = await applyQueuedOfflineActions(syncCaller, parsed.data.actions)

  return NextResponse.json({ results })
}
