import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { redis } from '@/lib/redis'
import type { UndoPayload } from '@/types/ai'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { undoId } = await req.json() as { undoId: string }
    if (!undoId) {
      return NextResponse.json({ error: 'undoId requerido' }, { status: 400 })
    }

    // ── Validate ownership — undoId includes userId segment ──────────────────
    if (!undoId.includes(user.id)) {
      return NextResponse.json({ error: 'Acción no pertenece a este usuario' }, { status: 403 })
    }

    if (!redis) {
      return NextResponse.json({ error: 'Redis no disponible — no se puede deshacer' }, { status: 503 })
    }

    const raw = await redis.get<string>(undoId)
    if (!raw) {
      return NextResponse.json(
        { error: 'La ventana de deshacer expiró (5 segundos). Usá la Papelera en cada módulo.' },
        { status: 410 }
      )
    }

    const payload: UndoPayload = typeof raw === 'string' ? JSON.parse(raw) : raw

    // ── Soft-delete the record ───────────────────────────────────────────────
    const { error: updateError } = await supabase
      .from(payload.table)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', payload.recordId)
      .eq('user_id', user.id) // Double-check RLS even with service role

    if (updateError) {
      console.error('[api/undo] Soft delete error:', updateError)
      return NextResponse.json({ error: `Error al deshacer: ${updateError.message}` }, { status: 500 })
    }

    // ── Remove from Redis ────────────────────────────────────────────────────
    await redis.del(undoId)

    return NextResponse.json({ success: true, message: 'Acción deshecha correctamente' })
  } catch (err: any) {
    console.error('[api/undo] Unexpected error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
