import { callGemini } from '@/lib/gemini/client'
import { generateEmbedding } from '@/lib/cerebro/embeddings'
import { searchSimilar, type CerebroSearchResult } from '@/lib/cerebro/indexing'
import { formatHabitSchedule, type HabitCustomRule } from '@/lib/habits/analytics'
import type { ChatMessage } from '@/types/ai'
import { createClient } from '@/utils/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

const CHAT_SYSTEM_PROMPT = `Sos Acrue, un asistente personal inteligente. Tenés acceso a los datos reales del usuario y podés responder preguntas sobre sus tareas, calendario, finanzas, hábitos, y más. Respondé siempre en español, de forma concisa y útil.

REGLAS:
- Usá los datos del contexto provisto para responder preguntas específicas
- DEBES responder SIEMPRE con un objeto JSON válido con esta estructura estricta:
  {
    "message": "Texto en lenguaje natural para el usuario. Esta será la única respuesta visible.",
    "action": { // (Opcional, solo si el usuario pide crear/modificar algo)
      "type": "create_task", 
      "payload": { "title": "...", "priority": 1, "due_at": "YYYY-MM-DDTHH:MM:SSZ" }
    }
  }
- Si el usuario hace una pregunta normal que no requiere acciones, respondé usando la misma estructura JSON pero omitiendo el campo "action".
- NO devuelvas texto fuera del JSON. Todo el output debe ser parseable.
- No inventés datos que no estén en el contexto
- Sé conciso — máximo 3 párrafos cortos en el campo message
- No uses emojis ni simbolos decorativos en la respuesta visible. Mantenela clara, sobria y consistente con la interfaz.

INTERPRETACIÓN DE FECHAS EN CONSULTAS:
Hoy es {{FECHA_HOY}} ({{DIA_SEMANA}}).

Cuando el usuario hace una PREGUNTA sobre el pasado (verbos como "gasté", "comí", "hice", "tuve"):
- "el lunes", "el martes", etc. → el día más reciente que ya pasó
- "esta semana" → desde el lunes de esta semana hasta hoy
- "la semana pasada" → lunes al domingo de la semana anterior

Cuando el usuario da una INSTRUCCIÓN para el futuro (verbos como "agregá", "poné", "recordame"):
- "el lunes", "el martes", etc. → el próximo día mencionado que aún no llegó
- "mañana" → fecha de hoy + 1 día
- "pasado mañana" → fecha de hoy + 2 días

SEMANAS RELATIVAS (basándose en hoy: {{FECHA_HOY}}):
- "esta semana" → lunes al domingo de la semana actual
- "la semana que viene" / "la próxima semana" / "la semana próxima" → lunes al domingo de la semana siguiente (hoy + 7 días aprox.)
- "la próxima semana no, la otra" / "la semana que viene no, la otra" / "en dos semanas" → lunes al domingo de la semana en 2 semanas (hoy + 14 días aprox.)
- "la semana pasada" / "la semana anterior" → lunes al domingo de la semana anterior
- "hace dos semanas" → semana de hoy - 14 días`

const MAX_CONTEXT_ITEMS = 20
const CEREBRO_QUERY_RE = /(^@cerebro\b|\b(cerebro|notebook|notebooks|nota|notas|apunte|apuntes|anotamos|anote|anotaste|resumen)\b)/i

type MaybeRelation<T> = T | T[] | null | undefined

interface NamedRelation {
  name: string | null
}

interface AssignmentContextRow {
  title: string
  type: string | null
  due_at: string | null
  completed: boolean | null
  subjects: MaybeRelation<NamedRelation>
}

interface ProjectTaskContextRow {
  status: string | null
  deleted_at: string | null
}

interface ProjectContextRow {
  name: string
  status: string | null
  due_at: string | null
  tasks: ProjectTaskContextRow[] | null
}

interface ExpenseContextRow {
  description: string | null
  amount: number
  date: string
  categories: MaybeRelation<NamedRelation>
}

interface SubscriptionContextRow {
  name: string
  amount: number
  currency: string
  renewal_date: string
}

interface SavingGoalContextRow {
  name: string
  target_amount: number
  current_amount: number
  deadline: string | null
}

interface PantryContextRow {
  name: string
  quantity: number | string | null
  unit: string | null
  min_stock: number | string | null
}

interface MealContextRow {
  description: string | null
  calories: number | null
  meal_type: string | null
  recipes: MaybeRelation<NamedRelation>
}

interface HabitContextRow {
  id: string
  name: string
  frequency: string
  days_of_week: number[] | null
  custom_rule: HabitCustomRule | null
  time_of_day: string | null
  active: boolean | null
}

interface HabitLogContextRow {
  habit_id: string
  completed_at: string
  event_type: 'complete' | 'uncomplete' | null
}

interface WishlistContextRow {
  name: string
  price: number | null
  currency: string | null
  priority: number | null
  status: string | null
}

function firstRelation<T>(value: MaybeRelation<T>): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined
}

export function isCerebroQuestion(message: string) {
  return CEREBRO_QUERY_RE.test(message.trim())
}

function stripCerebroPrefix(message: string) {
  return message.replace(/^@cerebro\b/i, '').trim() || message.trim()
}

function parseGeminiMessage(text: string) {
  try {
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(jsonStr) as { message?: string }
    return parsed.message?.trim() || text
  } catch {
    return text
  }
}

export async function answerCerebroQuestion(
  userId: string,
  message: string,
  supabaseClient?: SupabaseClient
): Promise<{ reply: string; sources: CerebroSearchResult[] }> {
  const supabase = supabaseClient || await createClient()
  const query = stripCerebroPrefix(message)
  const embedding = await generateEmbedding(query)
  const sources = await searchSimilar(supabase, userId, embedding, 5)

  if (!sources.length) {
    return {
      reply: 'No encontre notas relacionadas. Indexa un notebook en Cerebro y volve a buscar.',
      sources,
    }
  }

  const sourceContext = sources.map((source, index) => (
    `${index + 1}. ${source.title ?? 'Nota sin título'} (${source.notebookTitle ?? source.notebookId})\n${source.snippet}`
  )).join('\n\n')

  const { text } = await callGemini(`Pregunta del usuario: ${message}

Notas relevantes:
${sourceContext}

Responde en espanol con una respuesta breve y basada solo en estas notas.`, {
    systemInstruction: `Sos Acrue Cerebro. Responde siempre con JSON válido:
{ "message": "respuesta breve basada solo en las notas" }
No inventes datos. Si las notas no alcanzan, decilo.`,
    temperature: 0.2,
    maxOutputTokens: 360,
  })

  return {
    reply: text ? parseGeminiMessage(text) : sources[0].snippet,
    sources,
  }
}

/**
 * Builds a compact snapshot of user data for the given modules.
 * Avoids sending the entire database to Gemini.
 */
export async function buildChatContext(
  userId: string,
  modules: string[],
  supabaseClient?: SupabaseClient
): Promise<string> {
  const supabase = supabaseClient || await createClient()
  const parts: string[] = []

  if (modules.includes('tareas') || modules.length === 0) {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('title, priority, status, due_at')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .neq('status', 'done')
      .order('due_at', { ascending: true })
      .limit(MAX_CONTEXT_ITEMS)

    if (tasks?.length) {
      parts.push(`📋 TAREAS PENDIENTES (${tasks.length}):`)
      tasks.forEach((t) => {
        const due = t.due_at ? ` — vence ${new Date(t.due_at).toLocaleDateString('es-AR')}` : ''
        const priorityLabel = t.priority === 1 ? 'URGENTE' : t.priority === 2 ? 'NORMAL' : 'BAJO'
        parts.push(`  • [${priorityLabel}] ${t.title}${due}`)
      })
    }
  }

  if (modules.includes('calendario') || modules.length === 0) {
    const now = new Date().toISOString()
    const inTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

    const { data: events } = await supabase
      .from('calendar_events')
      .select('title, start_at, end_at')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('start_at', now)
      .lte('start_at', inTwoWeeks)
      .order('start_at', { ascending: true })
      .limit(10)

    if (events?.length) {
      parts.push(`\n📅 PRÓXIMOS EVENTOS (próximas 2 semanas):`)
      events.forEach((e) => {
        const date = new Date(e.start_at).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
        const time = new Date(e.start_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
        parts.push(`  • ${date} a las ${time}: ${e.title}`)
      })
    }
  }

  if (modules.includes('estudio') || modules.length === 0) {
    const { data: subjects } = await supabase
      .from('subjects')
      .select('name, code, status, credits, target_grade, final_grade, weekly_hours')
      .eq('user_id', userId)
      .limit(MAX_CONTEXT_ITEMS)

    if (subjects?.length) {
      parts.push(`\n📚 MATERIAS (${subjects.length}):`)
      subjects.forEach((s) => {
        const statusLabel = s.status === 'in_progress' ? 'Cursando' : s.status === 'approved' ? 'Aprobada' : s.status === 'failed' ? 'Desaprobada' : 'Pendiente'
        const grade = s.final_grade ? ` — nota final: ${s.final_grade}` : ''
        const target = s.target_grade ? ` (objetivo: ${s.target_grade})` : ''
        parts.push(`  • [${statusLabel}] ${s.name}${s.code ? ` (${s.code})` : ''}${grade}${target}`)
      })
    }

    // Upcoming assignments/exams
    const now = new Date().toISOString()
    const inTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

    const { data: assignments } = await supabase
      .from('assignments')
      .select('title, type, due_at, grade, weight, completed, subjects(name)')
      .gte('due_at', now)
      .lte('due_at', inTwoWeeks)
      .is('deleted_at', null)
      .order('due_at', { ascending: true })
      .limit(10)

    const assignmentRows = (assignments ?? []) as AssignmentContextRow[]
    if (assignmentRows.length) {
      parts.push(`\n🎓 EXÁMENES/ENTREGAS PRÓXIMAS:`)
      assignmentRows.forEach((a) => {
        const subjectName = firstRelation(a.subjects)?.name || 'Sin materia'
        const due = a.due_at ? new Date(a.due_at).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }) : ''
        const typeLabel = a.type === 'parcial' ? 'Parcial' : a.type === 'final' ? 'Final' : a.type === 'tp' ? 'TP' : a.type === 'quiz' ? 'Quiz' : 'Proyecto'
        parts.push(`  • [${typeLabel}] ${a.title} — ${subjectName} — ${due}${a.completed ? ' (completado)' : ''}`)
      })
    }
  }

  if (modules.includes('proyectos') || modules.length === 0) {
    const { data: projects } = await supabase
      .from('projects')
      .select('name, status, description, due_at, tasks(id, status, deleted_at)')
      .eq('user_id', userId)
      .in('status', ['active', 'planned', 'paused'])
      .limit(10)

    const projectRows = (projects ?? []) as ProjectContextRow[]
    if (projectRows.length) {
      parts.push(`\n🗂️ PROYECTOS ACTIVOS (${projectRows.length}):`)
      projectRows.forEach((p) => {
        const activeTasks = (p.tasks ?? []).filter((t) => t.deleted_at === null)
        const completedTasks = activeTasks.filter((t) => t.status === 'completed').length
        const totalTasks = activeTasks.length
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        const statusLabel = p.status === 'active' ? 'En progreso' : p.status === 'planned' ? 'Planificado' : 'Pausado'
        const due = p.due_at ? ` — vence ${new Date(p.due_at).toLocaleDateString('es-AR')}` : ''
        parts.push(`  • [${statusLabel}] ${p.name} — ${completedTasks}/${totalTasks} tareas (${progress}%)${due}`)
      })
    }
  }

  if (modules.includes('finanzas') || modules.length === 0) {
    // Recent expenses
    const { data: expenses } = await supabase
      .from('expenses')
      .select('description, amount, date, categories(name)')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .limit(20)

    const expenseRows = (expenses ?? []) as ExpenseContextRow[]
    if (expenseRows.length) {
      parts.push(`\n💰 ÚLTIMOS GASTOS (${expenseRows.length}):`)
      expenseRows.forEach((e) => {
        const cat = firstRelation(e.categories)?.name ?? 'Sin categoría'
        const date = new Date(e.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
        const sign = e.amount < 0 ? '-' : '+'
        parts.push(`  • ${date}: ${e.description || 'Sin desc'} — ${sign}$${Math.abs(e.amount).toLocaleString('es-AR')} (${cat})`)
      })
    }

    // Month summary
    const now = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const { data: monthExpenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('date', monthStart)

    if (monthExpenses?.length) {
      const income = monthExpenses.filter(e => e.amount > 0).reduce((s, e) => s + Number(e.amount), 0)
      const outflows = monthExpenses.filter(e => e.amount < 0).reduce((s, e) => s + Math.abs(Number(e.amount)), 0)
      parts.push(`\n📊 RESUMEN DEL MES:`)
      parts.push(`  • Ingresos: $${income.toLocaleString('es-AR')}`)
      parts.push(`  • Gastos: $${outflows.toLocaleString('es-AR')}`)
      parts.push(`  • Balance: $${(income - outflows).toLocaleString('es-AR')}`)
    }

    // Active subscriptions
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('name, amount, currency, renewal_date')
      .eq('user_id', userId)
      .eq('active', true)
      .order('renewal_date', { ascending: true })
      .limit(10)

    const subscriptionRows = (subs ?? []) as SubscriptionContextRow[]
    if (subscriptionRows.length) {
      parts.push(`\n🔄 SUSCRIPCIONES ACTIVAS (${subscriptionRows.length}):`)
      subscriptionRows.forEach((s) => {
        const renewal = new Date(s.renewal_date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
        parts.push(`  • ${s.name} — $${s.amount.toLocaleString('es-AR')} ${s.currency} — renueva ${renewal}`)
      })
    }

    // Saving goals
    const { data: goals } = await supabase
      .from('saving_goals')
      .select('name, target_amount, current_amount, deadline')
      .eq('user_id', userId)
      .limit(10)

    const goalRows = (goals ?? []) as SavingGoalContextRow[]
    if (goalRows.length) {
      parts.push(`\n🎯 METAS DE AHORRO (${goalRows.length}):`)
      goalRows.forEach((g) => {
        const pct = g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0
        const deadline = g.deadline ? ` — límite ${new Date(g.deadline).toLocaleDateString('es-AR')}` : ''
        parts.push(`  • ${g.name}: $${g.current_amount.toLocaleString('es-AR')}/$${g.target_amount.toLocaleString('es-AR')} (${pct}%)${deadline}`)
      })
    }
  }

  if (modules.includes('despensa') || modules.length === 0) {
    const { data: pantryItems } = await supabase
      .from('pantry_items')
      .select('name, quantity, unit, min_stock')
      .eq('user_id', userId)
      .order('name', { ascending: true })
      .limit(MAX_CONTEXT_ITEMS)

    const pantryRows = (pantryItems ?? []) as PantryContextRow[]
    if (pantryRows.length) {
      parts.push(`\n🥫 DESPENSA (${pantryRows.length} productos):`)
      pantryRows.forEach((item) => {
        const isLow = Number(item.quantity) < Number(item.min_stock)
        const status = isLow ? ' BAJO' : ''
        parts.push(`  • ${item.name}: ${item.quantity} ${item.unit}${status}`)
      })
    }
  }

  if (modules.includes('recetas') || modules.length === 0) {
    // Recipe count
    const { count: recipeCount } = await supabase
      .from('recipes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (recipeCount && recipeCount > 0) {
      parts.push(`\n🍳 RECETAS: ${recipeCount} recetas guardadas`)
    }

    // Today's meals
    const today = new Date().toISOString().split('T')[0]
    const { data: todayMeals } = await supabase
      .from('meal_log')
      .select('description, calories, meal_type, recipes(name)')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('logged_at', `${today}T00:00:00`)
      .lte('logged_at', `${today}T23:59:59`)
      .order('logged_at', { ascending: true })
      .limit(10)

    const mealRows = (todayMeals ?? []) as MealContextRow[]
    if (mealRows.length) {
      const totalCal = mealRows.reduce((s, m) => s + (m.calories ?? 0), 0)
      parts.push(`\n🍽️ COMIDAS DE HOY (${totalCal} kcal total):`)
      mealRows.forEach((m) => {
        const name = firstRelation(m.recipes)?.name ?? m.description ?? 'Sin descripción'
        const mealLabel = m.meal_type ? `[${m.meal_type}]` : ''
        parts.push(`  • ${mealLabel} ${name} — ${m.calories ?? '?'} kcal`)
      })
    }
  }

  if (modules.includes('habitos') || modules.includes('habits') || modules.length === 0) {
    const { data: habits } = await supabase
      .from('habits')
      .select('id, name, frequency, days_of_week, custom_rule, time_of_day, active')
      .eq('user_id', userId)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(MAX_CONTEXT_ITEMS)

    const habitRows = (habits ?? []) as HabitContextRow[]
    if (habitRows.length) {
      const today = new Date().toISOString().slice(0, 10)
      const { data: logs } = await supabase
        .from('habit_logs')
        .select('habit_id, completed_at, event_type')
        .in('habit_id', habitRows.map((habit) => habit.id))
        .gte('completed_at', `${today}T00:00:00.000Z`)
        .lte('completed_at', `${today}T23:59:59.999Z`)
        .order('completed_at', { ascending: true })

      const latestByHabit = new Map<string, HabitLogContextRow>()
      ;((logs ?? []) as HabitLogContextRow[]).forEach((log) => {
        latestByHabit.set(log.habit_id, log)
      })

      parts.push(`\nHABITOS ACTIVOS (${habitRows.length}):`)
      habitRows.forEach((habit) => {
        const latest = latestByHabit.get(habit.id)
        const status = latest && (latest.event_type ?? 'complete') === 'complete' ? 'Hecho hoy' : 'Pendiente'
        parts.push(`  - [${status}] ${habit.name} - ${formatHabitSchedule(habit)}`)
      })
    }
  }

  if (modules.includes('wishlist') || modules.includes('lista_deseos') || modules.length === 0) {
    const { data: wishlist } = await supabase
      .from('wishlist_items')
      .select('name, price, currency, priority, status')
      .eq('user_id', userId)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(MAX_CONTEXT_ITEMS)

    const wishlistRows = (wishlist ?? []) as WishlistContextRow[]
    if (wishlistRows.length) {
      parts.push(`\nWISHLIST (${wishlistRows.length}):`)
      wishlistRows.forEach((item) => {
        const status = item.status === 'purchased'
          ? 'Comprado'
          : item.status === 'saved'
            ? 'Ahorrando'
            : 'Deseado'
        const price = item.price ? ` - $${Number(item.price).toLocaleString('es-AR')} ${item.currency ?? 'ARS'}` : ''
        parts.push(`  - [${status}] ${item.name}${price}`)
      })
    }
  }

  if (!parts.length) {
    return 'No hay datos disponibles para este contexto.'
  }

  return parts.join('\n')
}

/**
 * Sends a message to the AI chatbot with conversation history and user context.
 * Returns the text reply and any extracted action if the AI decides to execute one.
 */
export async function sendChatMessage(
  userId: string,
  message: string,
  history: ChatMessage[],
  modules: string[],
  supabaseClient?: SupabaseClient
): Promise<{ reply: string; action?: Record<string, unknown> }> {
  if (isCerebroQuestion(message)) {
    try {
      const answer = await answerCerebroQuestion(userId, message, supabaseClient)
      return { reply: answer.reply }
    } catch {
      return { reply: 'No pude buscar en Cerebro ahora. Proba de nuevo en unos segundos.' }
    }
  }

  const contextSnapshot = await buildChatContext(userId, modules, supabaseClient)

  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Build conversation string for Gemini
  const historyText = history
    .slice(-10) // Last 10 messages to stay within token budget
    .map((m) => `${m.role === 'user' ? 'Usuario' : 'Acrue'}: ${m.content}`)
    .join('\n')

  const prompt = `FECHA HOY: ${today}

CONTEXTO DEL USUARIO:
${contextSnapshot}

HISTORIAL DE CONVERSACIÓN:
${historyText}

Usuario: ${message}
Acrue:`

  const systemInstruction = CHAT_SYSTEM_PROMPT
    .replace('{{FECHA_HOY}}', new Date().toISOString().split('T')[0])
    .replace('{{DIA_SEMANA}}', new Date().toLocaleDateString('es-AR', { weekday: 'long' }))

  const { text, error } = await callGemini(prompt, {
    systemInstruction,
    temperature: 0.7,
    maxOutputTokens: 512,
  })

  if (!text || error) {
    return {
      reply: 'La IA no está disponible en este momento. Intentá de nuevo en unos segundos.',
    }
  }

  // Parse the JSON response
  let replyMessage = text
  let action: Record<string, unknown> | undefined

  try {
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(jsonStr)
    if (parsed.message) {
      replyMessage = parsed.message
    }
    if (parsed.action) {
      action = parsed.action
    }
  } catch {
    // Si Gemini ignoró la regla y devolvió texto plano
    replyMessage = text
  }

  return { reply: replyMessage, action }
}
