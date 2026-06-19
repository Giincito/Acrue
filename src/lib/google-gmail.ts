import { google } from 'googleapis'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { withFallback } from '@/lib/integrations/resilience'
import { callGemini } from '@/lib/gemini/client'
import { logger } from '@/lib/server/logger'
import { redis as defaultRedis } from '@/lib/redis'
import type { UndoPayload } from '@/types/ai'
import { createServiceClient } from '@/utils/supabase/service'

export type GmailDigestEmail = {
  id: string
  threadId: string | null
  subject: string
  from: string
  date: string
  snippet: string
}

export type GmailEmailReadResult = {
  emails: GmailDigestEmail[]
  degraded: boolean
  error?: string
}

export type GmailExtractedTask = {
  title: string
  dueAt: string | null
  sourceEmailId: string
}

const UNDO_TTL_SECONDS = 5

type UndoStore = {
  set: (key: string, value: string, options: { ex: number }) => Promise<unknown>
}

export type CreatedGmailTask = {
  title: string
  recordId: string
  undoId?: string
}

export type CreateGmailTasksResult = {
  created: number
  skipped: number
  createdTasks: CreatedGmailTask[]
}

const extractedTaskSchema = z.object({
  title: z.string().min(1),
  dueAt: z.string().nullable().optional(),
  sourceEmailId: z.string().min(1),
})

export const gmailExtractedTasksSchema = z.array(extractedTaskSchema).max(8)

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/google/callback`
)

function getHeader(headers: Array<{ name?: string | null; value?: string | null }> | undefined, name: string) {
  return headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value ?? ''
}

async function getGoogleRefreshToken(userId: string): Promise<string | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('google_integrations')
    .select('refresh_token')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data?.refresh_token) {
    logger.warn('[gmail] No Google refresh token found')
    return null
  }

  return data.refresh_token
}

export async function getRelevantEmails(
  userId: string,
  now = new Date()
): Promise<GmailDigestEmail[]> {
  const result = await getRelevantEmailsWithStatus(userId, now)
  return result.emails
}

export async function getRelevantEmailsWithStatus(
  userId: string,
  now = new Date()
): Promise<GmailEmailReadResult> {
  const result = await withFallback<GmailDigestEmail[]>(
    async () => {
      const refreshToken = await getGoogleRefreshToken(userId)
      if (!refreshToken) return []

      oauth2Client.setCredentials({ refresh_token: refreshToken })
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
      const afterEpochSeconds = Math.floor((now.getTime() - 24 * 60 * 60 * 1000) / 1000)
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 10,
        q: `after:${afterEpochSeconds} -category:promotions -category:social`,
      })

      const messages = response.data.messages ?? []
      const emails = await Promise.all(
        messages
          .filter((message): message is { id: string; threadId?: string | null } => Boolean(message.id))
          .map(async (message) => {
            const detail = await gmail.users.messages.get({
              userId: 'me',
              id: message.id,
              format: 'metadata',
              metadataHeaders: ['Subject', 'From', 'Date'],
            })
            const headers = detail.data.payload?.headers

            return {
              id: detail.data.id ?? message.id,
              threadId: detail.data.threadId ?? message.threadId ?? null,
              subject: getHeader(headers, 'Subject') || 'Sin asunto',
              from: getHeader(headers, 'From') || 'Remitente no disponible',
              date: getHeader(headers, 'Date'),
              snippet: detail.data.snippet ?? '',
            }
          })
      )

      return emails
    },
    [],
    `gmail:emails:${userId}`,
    900
  )

  return {
    emails: result.data,
    degraded: Boolean(result.error),
    error: result.error,
  }
}

export async function summarizeGmailDigest(emails: GmailDigestEmail[]) {
  if (emails.length === 0) {
    return {
      summary: 'Sin correos relevantes en las últimas 24 horas.',
      extractedTasks: [] as GmailExtractedTask[],
      degraded: false,
    }
  }

  const prompt = `Resume estos correos en 2-3 líneas y extrae posibles tareas o fechas. Devuelve JSON válido con esta forma: {"summary":"...","tasks":[{"title":"...","dueAt":"YYYY-MM-DDTHH:mm:ss-03:00|null","sourceEmailId":"..."}]}.

Correos:
${emails.map((email) => `- id=${email.id}; asunto=${email.subject}; de=${email.from}; fecha=${email.date}; snippet=${email.snippet}`).join('\n')}`

  const result = await callGemini(prompt, {
    temperature: 0.2,
    maxOutputTokens: 500,
    systemInstruction: 'Respondé solo JSON válido, en español, sin markdown.',
  })

  if (!result.text) {
    return {
      summary: 'Gmail no respondió a tiempo. El resto del briefing sigue disponible.',
      extractedTasks: [] as GmailExtractedTask[],
      degraded: true,
    }
  }

  try {
    const parsed = JSON.parse(result.text) as { summary?: unknown; tasks?: unknown }
    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : 'Gmail revisado sin novedades claras.',
      extractedTasks: gmailExtractedTasksSchema.parse(parsed.tasks ?? []).map((task) => ({
        title: task.title,
        dueAt: task.dueAt ?? null,
        sourceEmailId: task.sourceEmailId,
      })),
      degraded: false,
    }
  } catch {
    return {
      summary: result.text.trim().slice(0, 280),
      extractedTasks: [] as GmailExtractedTask[],
      degraded: false,
    }
  }
}

export async function createTasksFromGmailDigest(
  userId: string,
  tasks: GmailExtractedTask[],
  supabase: SupabaseClient,
  options: { enableUndo?: boolean; redis?: UndoStore | null } = {}
): Promise<CreateGmailTasksResult> {
  let created = 0
  let skipped = 0
  const createdTasks: CreatedGmailTask[] = []
  const undoStore = options.redis === undefined ? defaultRedis : options.redis

  for (const task of tasks) {
    const { data: existing } = await supabase
      .from('tasks')
      .select('id')
      .eq('user_id', userId)
      .eq('metadata->>source_email_id', task.sourceEmailId)
      .maybeSingle()

    if (existing) {
      skipped++
      continue
    }

    const { data: inserted, error } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        title: task.title,
        due_at: task.dueAt ?? null,
        status: 'inbox',
        source: 'gmail',
        metadata: {
          source_email_id: task.sourceEmailId,
          created_by: 'gmail_digest',
        },
      })
      .select('id')
      .single()

    if (error || !inserted?.id) {
      logger.warn('[gmail] Could not create task from Gmail digest', { sourceEmailId: task.sourceEmailId, error })
      continue
    }

    created++
    const recordId = String(inserted.id)
    let undoId: string | undefined

    if (options.enableUndo && undoStore) {
      const candidateUndoId = `undo:${userId}:${recordId}`
      const undoPayload: UndoPayload = {
        userId,
        table: 'tasks',
        recordId,
        action: 'insert',
        timestamp: Date.now(),
      }

      await undoStore.set(candidateUndoId, JSON.stringify(undoPayload), { ex: UNDO_TTL_SECONDS }).then(() => {
        undoId = candidateUndoId
      }).catch((error) => {
        logger.error('[gmail] Redis error while storing Gmail task undo payload', error)
      })
    }

    createdTasks.push({
      title: task.title,
      recordId,
      undoId,
    })
  }

  return { created, skipped, createdTasks }
}
