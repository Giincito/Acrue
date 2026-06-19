import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { analyzeReceipt } from '@/lib/gemini/vision'
import { executeAiAction } from '@/lib/gemini/actions'
import { logger } from '@/lib/server/logger'

const EPHEMERAL_BUCKET = 'receipts-ephemeral'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const contentType = req.headers.get('content-type') ?? ''
  let imageBase64: string
  let mimeType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg'

  // ── Parse input: supports JSON base64 or multipart ───────────────────────
  if (contentType.includes('application/json')) {
    const body = await req.json()
    imageBase64 = body.image
    mimeType = body.mimeType ?? 'image/jpeg'
  } else if (contentType.includes('multipart/form-data')) {
    const form = await req.formData()
    const file = form.get('image') as File | null
    if (!file) return NextResponse.json({ error: 'Imagen requerida' }, { status: 400 })
    const buffer = await file.arrayBuffer()
    imageBase64 = Buffer.from(buffer).toString('base64')
    mimeType = (file.type as typeof mimeType) ?? 'image/jpeg'
  } else {
    return NextResponse.json({ error: 'Content-Type no soportado' }, { status: 415 })
  }

  if (!imageBase64) {
    return NextResponse.json({ error: 'Imagen requerida' }, { status: 400 })
  }

  // ── CRITICAL: Ephemeral storage with guaranteed cleanup ──────────────────
  const storagePath = `${user.id}/${Date.now()}.jpg`
  let uploadedToStorage = false

  try {
    // Step 1: Upload to Storage (ephemeral bucket)
    const imageBuffer = Buffer.from(imageBase64, 'base64')
    const { error: uploadError } = await supabase.storage
      .from(EPHEMERAL_BUCKET)
      .upload(storagePath, imageBuffer, {
        contentType: mimeType,
        upsert: true,
      })

    if (uploadError) {
      logger.warn('[vision] Storage upload failed, proceeding with inline data', { error: uploadError.message })
      // Fallback: analyze directly without storage upload
    } else {
      uploadedToStorage = true
    }

    // Step 2: Call Gemini Vision (always inline base64 — more reliable than signed URL)
    const receiptData = await analyzeReceipt(imageBase64, mimeType)

    if (!receiptData) {
      return NextResponse.json(
        { error: 'No se pudo extraer información del ticket. Intentá con una foto más clara.' },
        { status: 422 }
      )
    }

    // Step 3: INSERT into expenses via executeAiAction to get Undo functionality
    const { success, message, recordId, undoId } = await executeAiAction(
      user.id,
      { type: 'create_expense', payload: receiptData },
      supabase
    )

    if (!success) {
      logger.error('[vision] Action error:', message)
      return NextResponse.json({ error: `Error al guardar: ${message}` }, { status: 500 })
    }

    // Step 4: Return extracted data and undo ID
    return NextResponse.json({
      success: true,
      data: receiptData,
      expenseId: recordId,
      undoId,
    })
  } finally {
    // ── GUARANTEED cleanup: always delete from Storage ───────────────────
    if (uploadedToStorage) {
      const { error: deleteError } = await supabase.storage
        .from(EPHEMERAL_BUCKET)
        .remove([storagePath])

      if (deleteError) {
        logger.error('[vision] CRITICAL: Failed to delete ephemeral image!', deleteError.message)
        // Log but don't fail the response — data was already returned
      }
    }
  }
}
