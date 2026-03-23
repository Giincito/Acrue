import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { detectIntent } from '@/lib/gemini/router'
import { redis } from '@/lib/redis'
import type { RouterResponse, UndoPayload, GastoPayload, TareaPayload, EventoPayload, HabitoPayload, NotaPayload, ProyectoPayload, WishlistPayload } from '@/types/ai'

const CONFIDENCE_THRESHOLD = 0.90
const UNDO_TTL_SECONDS = 5

/** Maps an intent type to its Supabase table name */
const INTENT_TABLE_MAP: Record<string, string> = {
  create_expense: 'expenses',
  create_task: 'tasks',
  create_event: 'calendar_events',
  create_habit: 'habits',
  create_note: 'notes',
  create_project: 'projects',
  add_wishlist_item: 'wishlist_items',
}

/** Builds the Supabase row for each intent type */
function buildRow(intent: string, payload: any, userId: string): Record<string, unknown> | null {
  switch (intent) {
    case 'create_expense': {
      return {
        user_id: userId,
        description: payload.description || payload.descripcion,
        amount: -Math.abs(Number(payload.amount || payload.monto)),
        category: (payload.category || payload.categoria) ?? 'Sin categoría',
        date: (payload.date || payload.fecha) ?? new Date().toISOString().split('T')[0],
        payment_method: payload.payment_method ?? null,
        source: 'ai',
      }
    }
    case 'create_task': {
      const priorityMap: Record<string, number> = {
        high: 1, alta: 1, urgente: 1, '1': 1,
        medium: 2, media: 2, normal: 2, '2': 2,
        low: 3, baja: 3, bajo: 3, '3': 3,
      }

      const priority = typeof payload.priority === 'number'
        ? payload.priority
        : priorityMap[String(payload.priority).toLowerCase()] ?? 2

      return {
        user_id: userId,
        title: payload.title || payload.titulo,
        priority: priority,
        due_at: (payload.due_date || payload.due_at) ?? null,
        status: 'inbox',
        source: 'ai',
      }
    }
    case 'create_event': {
      const rawStart = payload.start_at || payload.starts_at || payload.date;
      return {
        user_id: userId,
        title: payload.title || payload.description || payload.titulo,
        start_at: rawStart.includes('T') ? rawStart : `${rawStart}T12:00:00-03:00`,
        end_at: payload.end_at || payload.ends_at || null,
        location: (payload.location || payload.ubicacion) ?? null,
        source: 'ai',
      }
    }
    case 'create_habit': {
      return {
        user_id: userId,
        name: payload.name || payload.nombre,
        frequency: (payload.frequency || payload.frecuencia) ?? 'daily',
        is_active: true,
      }
    }
    case 'create_project': {
      return {
        user_id: userId,
        name: payload.name || payload.nombre,
        description: payload.description ?? null,
        due_date: (payload.due_date || payload.fecha_limite) ?? null,
        status: 'active',
      }
    }
    case 'add_wishlist_item': {
      return {
        user_id: userId,
        name: payload.name || payload.nombre,
        price: (payload.price || payload.precio) ?? null,
        store: (payload.store || payload.tienda) ?? null,
        url: payload.url ?? null,
        status: 'deseado',
      }
    }
    case 'create_note': {
      return {
        user_id: userId,
        title: payload.title || '',
        content: payload.content || payload.contenido || '',
        source: 'ai',
      }
    }
    default:
      return null
  }
}

/** Human-readable confirmation message per intent */
function buildMessage(intent: string, payload: any): string {
  switch (intent) {
    case 'create_expense': return `✓ Gasto registrado — ${payload.description || payload.descripcion || 'Sin descripción'} $${Math.abs(Number(payload.amount || payload.monto || 0)).toLocaleString('es-AR')}`
    case 'create_task': return `✓ Tarea creada — ${payload.title || payload.titulo || 'Sin título'}`
    case 'create_event': return `✓ Evento agendado — ${payload.title || payload.titulo || 'Sin título'}`
    case 'create_habit': return `✓ Hábito registrado — ${payload.name || payload.nombre || 'Sin nombre'}`
    case 'create_note': return `✓ Nota guardada`
    case 'create_project': return `✓ Proyecto creado — ${payload.name || payload.nombre || 'Sin nombre'}`
    case 'add_wishlist_item': return `✓ Agregado a wishlist — ${payload.name || payload.nombre || 'Sin nombre'}`
    default: return `✓ Registrado`
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { text } = await req.json() as { text: string }
    if (!text?.trim()) {
      return NextResponse.json({ error: 'Texto requerido' }, { status: 400 })
    }

    const result = await detectIntent(text)

    if (!result) {
      return NextResponse.json<RouterResponse>({
        executed: false,
        message: 'IA no disponible. Podés usar los formularios directamente.',
        confidence: 0,
      })
    }

    const { intent, confidence, payload } = result

    // ── LOW CONFIDENCE ── Return preview for manual confirmation
    if (confidence <= CONFIDENCE_THRESHOLD || intent === 'desconocido') {
      return NextResponse.json<RouterResponse>({
        executed: false,
        message: 'Necesito confirmación antes de guardar',
        preview: payload,
        intent,
        confidence,
      })
    }

    // ── HIGH CONFIDENCE ── Insert directly into Supabase
    const table = INTENT_TABLE_MAP[intent]
    if (!table) {
      return NextResponse.json<RouterResponse>({
        executed: false,
        message: `No sé dónde guardar este tipo de dato (${intent})`,
        intent,
        confidence,
      })
    }

    const row = buildRow(intent, payload as Record<string, unknown>, user.id)
    if (!row) {
      return NextResponse.json<RouterResponse>({
        executed: false,
        message: 'No pude construir el registro',
        intent,
        confidence,
      })
    }

    console.log(`[router] Inserting into ${table}:`, row)

    const { data: inserted, error: dbError } = await supabase
      .from(table)
      .insert(row)
      .select('id')
      .single()
      
    console.log('[router] Insert result:', { data: inserted, error: dbError })

    if (dbError) {
      console.error('[ai/router] DB insert error:', dbError)
      return NextResponse.json({ error: `Error al guardar: ${dbError.message}` }, { status: 500 })
    }

    const recordId = inserted?.id as string
    const undoId = `undo:${user.id}:${recordId}`

    // Store undo payload in Redis with 5s TTL
    if (redis) {
      const undoPayload: UndoPayload = {
        userId: user.id,
        table,
        recordId,
        action: 'insert',
        timestamp: Date.now(),
      }
      await redis.set(undoId, JSON.stringify(undoPayload), { ex: UNDO_TTL_SECONDS })
    }

    return NextResponse.json<RouterResponse & { action_result: { success: boolean; id?: string } }>({
      executed: true,
      message: buildMessage(intent, payload as Record<string, unknown>),
      recordId,
      undoId,
      intent,
      confidence,
      action_result: { success: true, id: recordId }
    })
  } catch (err: any) {
    console.error('[ai/router] Unexpected error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
