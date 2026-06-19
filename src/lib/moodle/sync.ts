import {
  fetchMoodleAssignments,
  fetchMoodleCalendarUpcoming,
  fetchMoodleCourseContents,
  fetchMoodleCourses,
  fetchMoodleDiscussions,
  fetchMoodleForums,
  fetchMoodleQuizzes,
  getMoodleToken,
  withMoodleFallback,
} from '@/lib/moodle/client'
import { callGemini } from '@/lib/gemini/client'
import { getRequiredServerSecret } from '@/lib/server/cron-auth'
import { logger } from '@/lib/server/logger'
import { createServiceClient } from '@/utils/supabase/service'

type MoodleCredential = {
  user_id: string
  encrypted_username: string
  encrypted_password: string
  token: string | null
  token_expires_at: string | null
}

type DecryptedMoodleCredentials = {
  username: string
  password: string
}

export type MoodleSyncResult = {
  message: string
  syncCount: number
  newEvents: number
}

type MoodleSyncOptions = {
  userId?: string
}

type SupabaseServiceClient = ReturnType<typeof createServiceClient>

async function summarizeText(title: string, content: string) {
  const cleanStr = content.replace(/<[^>]+>/g, '').trim()
  if (cleanStr.length < 120) return cleanStr

  const { text } = await callGemini(
    `Resume este aviso/texto universitario en maximo 3 lineas directas. Elimina saludos y formalidades. Extrae lo mas importante. Titulo original: "${title}". Texto: "${cleanStr}"`,
    { temperature: 0.1, maxOutputTokens: 150 }
  )

  return text || `${cleanStr.substring(0, 200)}...`
}

async function hasMoodleEvent(
  supabaseAdmin: SupabaseServiceClient,
  userId: string,
  moodleId: number,
  type: string
) {
  const { data } = await supabaseAdmin
    .from('moodle_events')
    .select('id')
    .eq('user_id', userId)
    .eq('moodle_id', moodleId)
    .eq('type', type)
    .maybeSingle()

  return Boolean(data)
}

export async function syncMoodleUsers(options: MoodleSyncOptions = {}): Promise<MoodleSyncResult> {
  const supabaseAdmin = createServiceClient()
  const encryptionKey = getRequiredServerSecret('MOODLE_ENCRYPTION_KEY')
  let credentialsQuery = supabaseAdmin
    .from('moodle_credentials')
    .select('user_id, encrypted_username, encrypted_password, token, token_expires_at')

  if (options.userId) {
    credentialsQuery = credentialsQuery.eq('user_id', options.userId)
  }

  const { data: credentials, error } = await credentialsQuery

  if (error || !credentials) {
    throw new Error(error?.message || 'DB Error')
  }

  let syncCount = 0
  let eventCount = 0

  for (const cred of credentials as MoodleCredential[]) {
    try {
      const { data: decrypted } = await supabaseAdmin.rpc('decrypt_moodle_creds', {
        p_user_id: cred.user_id,
        p_key: encryptionKey,
      })
      if (!decrypted) continue

      const moodleCreds = decrypted as DecryptedMoodleCredentials
      let token = cred.token
      const tokenExpired = !cred.token_expires_at || new Date(cred.token_expires_at) < new Date()

      if (!token || tokenExpired) {
        token = await withMoodleFallback(() => getMoodleToken(moodleCreds.username, moodleCreds.password), 'token refresh')
        if (!token) continue

        await supabaseAdmin
          .from('moodle_credentials')
          .update({
            token,
            token_expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
          })
          .eq('user_id', cred.user_id)
      }

      const courses = await withMoodleFallback(() => fetchMoodleCourses(token!), 'courses')
      if (!courses || courses.length === 0) continue

      const courseIds = courses.map((course) => course.id)
      const courseMap = new Map(courses.map((course) => [course.id, course.fullname]))
      const now = Math.floor(Date.now() / 1000)

      const assignmentCourses = await withMoodleFallback(() => fetchMoodleAssignments(token!, courseIds), 'assignments')
      if (assignmentCourses) {
        for (const course of assignmentCourses) {
          for (const assignment of course.assignments) {
            const existingEvent = await hasMoodleEvent(supabaseAdmin, cred.user_id, assignment.id, 'assignment')
            const ev = await supabaseAdmin
              .from('moodle_events')
              .upsert({
                user_id: cred.user_id,
                moodle_id: assignment.id,
                course_id: assignment.course,
                course_name: course.fullname,
                type: 'assignment',
                title: assignment.name,
                description: assignment.intro,
                event_date: new Date(assignment.duedate * 1000).toISOString(),
              }, { onConflict: 'user_id, moodle_id, type' })
              .select('id')
              .maybeSingle()

            if (!existingEvent && ev.data && assignment.duedate > now) {
              eventCount++
              await supabaseAdmin.from('tasks').insert({
                user_id: cred.user_id,
                title: `[Moodle] ${assignment.name}`,
                due_at: new Date(assignment.duedate * 1000).toISOString(),
                source: 'moodle',
                priority: 2,
                status: 'inbox',
                university_type: 'assignment',
                metadata: { moodle_course: course.fullname, moodle_assignment_id: assignment.id },
              })
            }
          }
        }
      }

      const quizzes = await withMoodleFallback(() => fetchMoodleQuizzes(token!, courseIds), 'quizzes')
      if (quizzes) {
        for (const quiz of quizzes) {
          const existingEvent = await hasMoodleEvent(supabaseAdmin, cred.user_id, quiz.id, 'quiz')
          const ev = await supabaseAdmin
            .from('moodle_events')
            .upsert({
              user_id: cred.user_id,
              moodle_id: quiz.id,
              course_id: quiz.course,
              course_name: courseMap.get(quiz.course) || 'Curso',
              type: 'quiz',
              title: quiz.name,
              description: quiz.intro,
              event_date: new Date(quiz.timeclose * 1000).toISOString(),
            }, { onConflict: 'user_id, moodle_id, type' })
            .select('id')
            .maybeSingle()

          if (!existingEvent && ev.data && quiz.timeclose > now) {
            eventCount++
            await supabaseAdmin.from('tasks').insert({
              user_id: cred.user_id,
              title: `[Examen] ${quiz.name}`,
              due_at: new Date(quiz.timeclose * 1000).toISOString(),
              source: 'moodle',
              priority: 3,
              status: 'inbox',
              university_type: 'exam',
              metadata: { moodle_course: courseMap.get(quiz.course), moodle_quiz_id: quiz.id },
            })
          }
        }
      }

      const forums = await withMoodleFallback(() => fetchMoodleForums(token!, courseIds), 'forums')
      if (forums) {
        for (const forum of forums) {
          const discussions = await withMoodleFallback(
            () => fetchMoodleDiscussions(token!, forum.id, 0, 5),
            `forum ${forum.id}`
          )
          if (!discussions) continue

          for (const disc of discussions) {
            const { data: existing } = await supabaseAdmin
              .from('moodle_events')
              .select('id')
              .eq('user_id', cred.user_id)
              .eq('moodle_id', disc.id)
              .eq('type', 'forum')
              .maybeSingle()

            if (!existing) {
              const summary = await summarizeText(disc.name, disc.message)
              await supabaseAdmin.from('moodle_events').upsert({
                user_id: cred.user_id,
                moodle_id: disc.id,
                course_id: forum.course,
                course_name: courseMap.get(forum.course) || 'Curso',
                type: 'forum',
                title: disc.name,
                description: disc.message,
                event_date: new Date(disc.created * 1000).toISOString(),
                ai_summary: summary,
              }, { onConflict: 'user_id, moodle_id, type' })
              eventCount++
            }
          }
        }
      }

      for (const courseId of courseIds) {
        const sections = await withMoodleFallback(() => fetchMoodleCourseContents(token!, courseId), `contents ${courseId}`)
        if (!sections) continue

        for (const section of sections) {
          for (const mod of section.modules) {
            if (mod.modname === 'resource' || mod.modname === 'url') {
              const existingEvent = await hasMoodleEvent(supabaseAdmin, cred.user_id, mod.id, 'resource')
              const ev = await supabaseAdmin
                .from('moodle_events')
                .upsert({
                  user_id: cred.user_id,
                  moodle_id: mod.id,
                  course_id: courseId,
                  course_name: courseMap.get(courseId) || 'Curso',
                  type: 'resource',
                  title: mod.name,
                  url: mod.url,
                }, { onConflict: 'user_id, moodle_id, type' })
                .select('id')
                .maybeSingle()

              if (!existingEvent && ev.data) eventCount++
            } else if (mod.modname === 'folder' && mod.contents) {
              const existingFolder = await hasMoodleEvent(supabaseAdmin, cred.user_id, mod.id, 'resource')
              await supabaseAdmin.from('moodle_events').upsert({
                user_id: cred.user_id,
                moodle_id: mod.id,
                course_id: courseId,
                course_name: courseMap.get(courseId) || 'Curso',
                type: 'resource',
                title: mod.name,
                url: mod.url,
              }, { onConflict: 'user_id, moodle_id, type' })
              if (!existingFolder) eventCount++

              for (let i = 0; i < mod.contents.length; i++) {
                const file = mod.contents[i]
                const moodleId = mod.id * 1000 + i
                const existingFile = await hasMoodleEvent(supabaseAdmin, cred.user_id, moodleId, 'resource')
                const ev = await supabaseAdmin
                  .from('moodle_events')
                  .upsert({
                    user_id: cred.user_id,
                    moodle_id: moodleId,
                    parent_moodle_id: mod.id,
                    course_id: courseId,
                    course_name: courseMap.get(courseId) || 'Curso',
                    type: 'resource',
                    title: file.filename,
                    url: file.fileurl,
                    event_date: file.timemodified ? new Date(file.timemodified * 1000).toISOString() : null,
                  }, { onConflict: 'user_id, moodle_id, type' })
                  .select('id')
                  .maybeSingle()

                if (!existingFile && ev.data) eventCount++
              }
            }
          }
        }
      }

      const upcomingEvents = await withMoodleFallback(() => fetchMoodleCalendarUpcoming(token!), 'calendar_upcoming')
      if (upcomingEvents && upcomingEvents.length > 0) {
        for (const evt of upcomingEvents) {
          const courseName = evt.courseid ? (courseMap.get(evt.courseid) || 'Campus') : 'Universidad'
          const existingEvent = await hasMoodleEvent(supabaseAdmin, cred.user_id, evt.id, 'calendar_event')
          const ev = await supabaseAdmin
            .from('moodle_events')
            .upsert({
              user_id: cred.user_id,
              moodle_id: evt.id,
              course_id: evt.courseid || null,
              course_name: courseName,
              type: 'calendar_event',
              title: evt.name,
              description: evt.description,
              event_date: evt.timestart ? new Date(evt.timestart * 1000).toISOString() : null,
            }, { onConflict: 'user_id, moodle_id, type' })
            .select('id')
            .maybeSingle()
          if (!existingEvent && ev.data) {
            eventCount++
          }
        }
      }

      await supabaseAdmin
        .from('moodle_credentials')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('user_id', cred.user_id)

      syncCount++
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Error interno'
      logger.error('[moodle-sync] user loop error:', message)
    }
  }

  return { message: 'Sync complete', syncCount, newEvents: eventCount }
}
