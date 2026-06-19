/**
 * AI-driven study planning.
 * Detects upcoming exams and generates study task suggestions.
 * @module lib/gemini/study-planner
 */

import { callGemini } from '@/lib/gemini/client'
import type { SupabaseClient } from '@supabase/supabase-js'

interface UpcomingExam {
  title: string
  type: string
  subject: string
  dueDate: string
  daysUntil: number
}

type MaybeRelation<T> = T | T[] | null | undefined

interface AssignmentExamRow {
  title: string
  type: string
  due_at: string
  subjects: MaybeRelation<{ name: string | null }>
}

function firstRelation<T>(value: MaybeRelation<T>): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined
}

/**
 * Fetches upcoming exams (next 14 days) for a user.
 */
export async function getUpcomingExams(
  supabase: SupabaseClient,
  userId: string
): Promise<UpcomingExam[]> {
  const now = new Date()
  const inTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

  const { data: assignments } = await supabase
    .from('assignments')
    .select('title, type, due_at, subjects(name)')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .eq('completed', false)
    .gte('due_at', now.toISOString())
    .lte('due_at', inTwoWeeks.toISOString())
    .order('due_at', { ascending: true })
    .limit(10)

  if (!assignments?.length) return []

  const assignmentRows = assignments as AssignmentExamRow[]

  return assignmentRows.map((a) => {
    const dueDate = new Date(a.due_at)
    const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    return {
      title: a.title,
      type: a.type,
      subject: firstRelation(a.subjects)?.name || 'Sin materia',
      dueDate: dueDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }),
      daysUntil,
    }
  })
}

/**
 * Generates a study plan based on upcoming exams using Gemini.
 * Returns structured task suggestions.
 */
export async function generateStudyPlan(
  exams: UpcomingExam[]
): Promise<{ tasks: Array<{ title: string; day: string; hours: number }> } | null> {
  if (exams.length === 0) return null

  const examList = exams
    .map((e) => `- ${e.type.toUpperCase()}: "${e.title}" de ${e.subject} — ${e.dueDate} (en ${e.daysUntil} días)`)
    .join('\n')

  const prompt = `Tengo los siguientes exámenes/entregas próximas:

${examList}

Generá un plan de estudio como un JSON array de tareas, distribuyendo el tiempo de preparación de forma equilibrada. Cada tarea debe tener:
- "title": descripción corta de la sesión de estudio (ej: "Repasar capítulo 3 de AED")
- "day": fecha sugerida en formato YYYY-MM-DD
- "hours": horas estimadas (1-4)

Priorizá los exámenes más cercanos. Máximo 8 tareas. Respondé SOLO con el JSON:
{ "tasks": [...] }`

  const { text, error } = await callGemini(prompt, {
    systemInstruction: 'Sos un asistente académico. Respondé SOLO con JSON válido, sin texto adicional.',
    temperature: 0.5,
    maxOutputTokens: 512,
  })

  if (!text || error) return null

  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return parsed
  } catch {
    return null
  }
}

/**
 * Summarizes Moodle notifications/announcements into 3 lines max.
 */
export async function summarizeMoodleAnnouncements(
  announcements: string[]
): Promise<string | null> {
  if (announcements.length === 0) return null

  const prompt = `Resumí estos avisos del campus virtual en máximo 3 líneas breves en español:

${announcements.join('\n')}

Respondé solo con el resumen, sin formato extra.`

  const { text, error } = await callGemini(prompt, {
    systemInstruction: 'Sos un asistente académico. Sé conciso.',
    temperature: 0.3,
    maxOutputTokens: 200,
  })

  if (!text || error) return null
  return text.trim()
}
