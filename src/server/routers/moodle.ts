import { router, protectedProcedure } from '../trpc'
import { z } from 'zod'
import { syncMoodleUsers } from '@/lib/moodle/sync'

export const moodleRouter = router({
  getEvents: protectedProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from('moodle_events')
        .select('*')
        .eq('user_id', ctx.user.id)
        .order('is_completed', { ascending: true })
        .order('event_date', { ascending: false })
        .limit(200)

      if (error) {
        throw new Error(error.message)
      }

      return data
    }),

  getOverallSummary: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from('moodle_events')
        .select('*')
        .eq('user_id', ctx.user.id)
        .eq('is_completed', false)
        .order('event_date', { ascending: false })
        .limit(10)

      if (error || !data || data.length === 0) return null

      const prompt = `Estos son los últimos ${data.length} movimientos académicos pendientes del estudiante:
${data.map(d => `- Materia: ${d.course_name} | Tipo: ${d.type} | Título: ${d.title}${d.user_notes ? ` | Nota del alumno: "${d.user_notes}"` : ''}`).join('\n')}

Por favor provee un resumen táctico, amigable y muy conciso (máximo 2 líneas) de su situación actual para que de un vistazo sepa qué es lo principal que ocurrió o se viene.`

      const { callGemini } = await import('@/lib/gemini/client')
      const res = await callGemini(prompt, {
        systemInstruction: "Eres un asistente universitario directo, proactivo y premium. Responde sin usar markdown de bloques (solo negritas si quieres resaltar) y sé motivacional."
      })

      return res.text
    }),
    
  updateEvent: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      is_completed: z.boolean().optional(),
      user_notes: z.string().nullable().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input
      const { data, error } = await ctx.supabase
        .from('moodle_events')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', ctx.user.id)
        .select()
        .single()
        
      if (error) throw new Error(error.message)
      return data
    }),
    
  getCalendarEvents: protectedProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from('moodle_events')
        .select('*')
        .eq('user_id', ctx.user.id)
        .in('type', ['calendar_event', 'assignment', 'quiz'])
        .is('is_completed', false)
        .gte('event_date', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Show today and future
        .order('event_date', { ascending: true })
        .limit(20)

      if (error) throw new Error(error.message)
      return data
    }),

  generateStudyPlan: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Fetch upcoming calendar events that aren't completed
      const { data, error } = await ctx.supabase
        .from('moodle_events')
        .select('*')
        .eq('user_id', ctx.user.id)
        // We can just use calendar_events or assignments since the AI study plan is for the whole Moodle
        .in('type', ['calendar_event', 'assignment', 'quiz'])
        .eq('is_completed', false)
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(15)

      if (error) throw new Error(error.message)
      
      if (!data || data.length === 0) {
        return "No hay fechas próximas cargadas en tu calendario de Moodle para armar un plan de estudio."
      }

      const prompt = `Estos son los próximos vencimientos y fechas clave del usuario importados del campus:
${data.map(d => `- [${d.course_name}] ${d.title} (Fecha: ${new Date(d.event_date!).toLocaleDateString('es-AR')})`).join('\n')}

Por favor, actúa como un AI Study Planner experto. 
Arma un itinerario o plan de estudio muy concreto y accionable basado en estas fechas clave.
Sé conciso, amigable y estructurado. Indica prioridades. Usa formato Markdown con viñetas, sin saludos excesivos.`

      const { callGemini } = await import('@/lib/gemini/client')
      const res = await callGemini(prompt, {
        systemInstruction: "Eres Acrue, un asistente académico avanzado que optimiza el tiempo de estudio de estudiantes universitarios.",
        temperature: 0.4
      })

      return res.text
    }),

  triggerSync: protectedProcedure
    .mutation(async ({ ctx }) => {
      return syncMoodleUsers({ userId: ctx.user.id })
    })
})
