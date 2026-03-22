import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { detectIntent } from '@/lib/gemini/router'
import { redis } from '@/lib/redis'
import type { RouterResponse, UndoPayload, GastoPayload, TareaPayload, EventoPayload, HabitoPayload, NotaPayload, ProyectoPayload, WishlistPayload } from '@/types/ai'

const CONFIDENCE_THRESHOLD = 0.90
const UNDO_TTL_SECONDS = 5

/** Maps an intent type to its Supabase table name */
const INTENT_TABLE_MAP: Record<string, string> = {
  gasto: 'expenses',
  ingreso: 'expenses',
  tarea: 'tasks',
  evento: 'calendar_events',
  habito: 'habits',
  nota: 'notes',
  proyecto: 'projects',
  wishlist: 'wishlist_items',
}

/** Builds the Supabase row for each intent type */
function buildRow(intent: string, payload: Record<string, unknown>, userId: string): Record<string, unknown> | null {
  switch (intent) {
    case 'gasto':
    case 'ingreso': {
      const p = payload as unknown as GastoPayload
      return {
        user_id: userId,
        description: p.descripcion,
        amount: intent === 'ingreso' ? Math.abs(Number(p.monto)) : -Math.abs(Number(p.monto)),
        category: p.categoria ?? 'Sin categoría',
        date: p.fecha ?? new Date().toISOString().split('T')[0],
        payment_method: p.metodo_pago ?? null,
        source: 'ai',
      }
    }
    case 'tarea': {
      const p = payload as unknown as TareaPayload
      return {
        user_id: userId,
        title: p.title,
        priority: p.priority ?? 2,
        due_at: p.due_at ?? null,
        status: 'inbox',
        source: 'ai',
      }
    }
    case 'evento': {
      const p = payload as unknown as EventoPayload
      return {
        user_id: userId,
        title: p.titulo,
        description: p.descripcion ?? null,
        starts_at: p.starts_at,
        ends_at: p.ends_at ?? null,
        location: p.ubicacion ?? null,
        source: 'ai',
      }
    }
    case 'habito': {
      const p = payload as unknown as HabitoPayload
      return {
        user_id: userId,
        name: p.nombre,
        frequency: p.frecuencia ?? 'daily',
        is_active: true,
      }
    }
    case 'proyecto': {
      const p = payload as unknown as ProyectoPayload
      return {
        user_id: userId,
        name: p.nombre,
        description: p.descripcion ?? null,
        due_date: p.fecha_limite ?? null,
        status: 'active',
      }
    }
    case 'wishlist': {
      const p = payload as unknown as WishlistPayload
      return {
        user_id: userId,
        name: p.nombre,
        price: p.precio ?? null,
        store: p.tienda ?? null,
        url: p.url ?? null,
        status: 'deseado',
      }
    }
    default:
      return null
  }
}

/** Human-readable confirmation message per intent */
function buildMessage(intent: string, payload: Record<string, unknown>): string {
  switch (intent) {
    case 'gasto': return `✓ Gasto registrado — ${payload.descripcion ?? 'Sin descripción'} $${Math.abs(Number(payload.monto ?? 0)).toLocaleString('es-AR')}`
    case 'ingreso': return `✓ Ingreso registrado — ${payload.descripcion ?? 'Sin descripción'} $${Math.abs(Number(payload.monto ?? 0)).toLocaleString('es-AR')}`
    case 'tarea': return `✓ Tarea creada — ${payload.titulo ?? 'Sin título'}`
    case 'evento': return `✓ Evento agendado — ${payload.titulo ?? 'Sin título'}`
    case 'habito': return `✓ Hábito registrado — ${payload.nombre ?? 'Sin nombre'}`
    case 'nota': return `✓ Nota guardada`
    case 'proyecto': return `✓ Proyecto creado — ${payload.nombre ?? 'Sin nombre'}`
    case 'wishlist': return `✓ Agregado a wishlist — ${payload.nombre ?? 'Sin nombre'}`
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

    const { data: inserted, error: dbError } = await supabase
      .from(table)
      .insert(row)
      .select('id')
      .single()

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

    return NextResponse.json<RouterResponse>({
      executed: true,
      message: buildMessage(intent, payload as Record<string, unknown>),
      recordId,
      undoId,
      intent,
      confidence,
    })
  } catch (err: any) {
    console.error('[ai/router] Unexpected error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
