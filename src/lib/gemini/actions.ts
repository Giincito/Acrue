import { createClient } from '@/utils/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { redis } from '@/lib/redis'
import { suggestCategory } from '@/lib/finanzas/categories'
import type { UndoPayload } from '@/types/ai'
import { z } from 'zod'
import { logger } from '@/lib/server/logger'

const UNDO_TTL_SECONDS = 5
type AiActionPayload = Record<string, unknown>
type AiActionValidation =
  | { success: true; payload: AiActionPayload }
  | { success: false; message: string }

const payloadRecordSchema = z.record(z.string(), z.unknown())

function parseNumberLike(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null

  const compact = value.trim().replace(/[^\d,.-]/g, '')
  if (!compact) return null

  const normalized = compact.includes(',') && compact.lastIndexOf(',') > compact.lastIndexOf('.')
    ? compact.replace(/\./g, '').replace(',', '.')
    : compact.replace(/,/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function hasText(payload: AiActionPayload, ...keys: string[]) {
  return keys.some((key) => {
    const value = payload[key]
    return typeof value === 'string' && value.trim().length > 0
  })
}

function hasPositiveNumber(payload: AiActionPayload, ...keys: string[]) {
  return keys.some((key) => {
    const parsed = parseNumberLike(payload[key])
    return parsed !== null && Math.abs(parsed) > 0
  })
}

const AI_ACTION_PAYLOAD_SCHEMAS: Record<string, z.ZodType<AiActionPayload>> = {
  create_expense: payloadRecordSchema.refine(
    (payload) => hasPositiveNumber(payload, 'amount', 'monto'),
    { message: 'create_expense requiere amount/monto mayor a 0' }
  ),
  create_task: payloadRecordSchema.refine(
    (payload) => hasText(payload, 'title', 'titulo'),
    { message: 'create_task requiere title/titulo' }
  ),
  create_event: payloadRecordSchema.refine(
    (payload) => hasText(payload, 'start_at', 'starts_at', 'date', 'due_at'),
    { message: 'create_event requiere start_at/starts_at/date/due_at' }
  ),
  create_habit: payloadRecordSchema.refine(
    (payload) => hasText(payload, 'name', 'nombre'),
    { message: 'create_habit requiere name/nombre' }
  ),
  create_note: payloadRecordSchema.refine(
    (payload) => hasText(payload, 'content', 'title', 'text', 'note', 'nota'),
    { message: 'create_note requiere content/title/text' }
  ),
  create_project: payloadRecordSchema.refine(
    (payload) => hasText(payload, 'name', 'nombre'),
    { message: 'create_project requiere name/nombre' }
  ),
  add_wishlist_item: payloadRecordSchema.refine(
    (payload) => hasText(payload, 'name', 'nombre'),
    { message: 'add_wishlist_item requiere name/nombre' }
  ),
  create_debt: payloadRecordSchema.refine(
    (payload) => hasPositiveNumber(payload, 'amount', 'monto'),
    { message: 'create_debt requiere amount/monto mayor a 0' }
  ),
  create_recipe: payloadRecordSchema.refine(
    (payload) => hasText(payload, 'name', 'nombre'),
    { message: 'create_recipe requiere name/nombre' }
  ),
  log_meal: payloadRecordSchema.refine(
    (payload) => hasText(payload, 'description', 'descripcion', 'recipe_id', 'name', 'nombre'),
    { message: 'log_meal requiere description/recipe_id/name' }
  ),
  add_pantry_item: payloadRecordSchema.refine(
    (payload) => hasText(payload, 'name', 'nombre'),
    { message: 'add_pantry_item requiere name/nombre' }
  ),
  add_to_shopping_list: payloadRecordSchema.refine(
    (payload) => hasText(payload, 'name', 'nombre'),
    { message: 'add_to_shopping_list requiere name/nombre' }
  ),
}

export function validateAiActionPayload(intent: string, payload: unknown): AiActionValidation {
  const schema = AI_ACTION_PAYLOAD_SCHEMAS[intent]
  if (!schema) {
    return { success: false, message: `Intent no soportado: ${intent}` }
  }

  const result = schema.safeParse(payload)
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? 'payload invalido'
    return { success: false, message: `Payload invalido para ${intent}: ${message}` }
  }

  return { success: true, payload: result.data }
}

/** Maps an intent type to its Supabase table name */
const INTENT_TABLE_MAP: Record<string, string> = {
  create_expense: 'expenses',
  create_task: 'tasks',
  create_event: 'calendar_events',
  create_habit: 'habits',
  create_project: 'projects',
  add_wishlist_item: 'wishlist_items',
  create_debt: 'debts',
  create_recipe: 'recipes',
  log_meal: 'meal_log',
  add_pantry_item: 'pantry_items',
  add_to_shopping_list: 'shopping_list',
}

export function getAiActionTable(intent: string): string | null {
  return INTENT_TABLE_MAP[intent] ?? null
}

function normalizePayload(payload: unknown): AiActionPayload {
  return payload && typeof payload === 'object' ? payload as AiActionPayload : {}
}

function firstPayloadValue(payload: AiActionPayload, ...keys: string[]) {
  for (const key of keys) {
    const value = payload[key]
    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }
  return undefined
}

function payloadText(payload: AiActionPayload, ...keys: string[]) {
  const value = firstPayloadValue(payload, ...keys)
  return value === undefined ? undefined : String(value)
}

function payloadTextOr(payload: AiActionPayload, fallback: string, ...keys: string[]) {
  return payloadText(payload, ...keys) ?? fallback
}

function payloadNumber(payload: AiActionPayload, fallback: number, ...keys: string[]) {
  const value = firstPayloadValue(payload, ...keys)
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

function payloadStringArray(payload: AiActionPayload, ...keys: string[]) {
  const value = firstPayloadValue(payload, ...keys)
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

/** Standardizes date-only strings from Gemini (YYYY-MM-DD) to local noon offset (-03:00) 
 * to prevent UTC-based 'off-by-one' day shifts in the UI. */
function toLocalIso(dateStr?: string) {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  // If it's exactly YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T12:00:00-03:00`; 
  }
  return trimmed;
}

/** Resolves category_id from AI suggested name or description-based fallback */
async function resolveCategoryId(
  supabase: SupabaseClient,
  userId: string,
  suggestedName?: string,
  description?: string
): Promise<string | null> {
  // Use AI suggestion first, then local keyword matching as fallback
  const categoryName = suggestedName || suggestCategory(description || '')

  const { data: cat } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', userId)
    .ilike('name', categoryName)
    .limit(1)
    .single()

  return cat?.id ?? null
}

/** Builds the Supabase row for each intent type */
export async function buildAiActionRow(
  intent: string,
  payload: AiActionPayload,
  userId: string,
  supabase?: SupabaseClient
): Promise<Record<string, unknown> | null> {
  switch (intent) {
    case 'create_expense': {
      const description = payloadText(payload, 'description', 'descripcion', 'comercio', 'merchant') ?? 'Gasto registrado'
      let categoryId: string | null = null

      if (supabase) {
        try {
          categoryId = await resolveCategoryId(
            supabase,
            userId,
            payloadText(payload, 'suggested_category', 'category', 'categoria'),
            description
          )
        } catch {
          // Graceful: if category lookup fails, proceed without category_id
        }
      }

      return {
        user_id: userId,
        description,
        amount: -Math.abs(payloadNumber(payload, 0, 'amount', 'monto')),
        category_id: categoryId,
        date: toLocalIso(payloadText(payload, 'date', 'fecha')) ?? new Date().toISOString().split('T')[0],
        source: 'ai',
      }
    }
    case 'create_task': {
      const priorityMap: Record<string, number> = {
        high: 1, alta: 1, urgente: 1, '1': 1,
        medium: 2, media: 2, normal: 2, '2': 2,
        low: 3, baja: 3, bajo: 3, '3': 3,
      }

      const priorityValue = firstPayloadValue(payload, 'priority')
      const priority = typeof priorityValue === 'number'
        ? priorityValue
        : priorityMap[String(priorityValue).toLowerCase()] ?? 2

      return {
        user_id: userId,
        title: payloadText(payload, 'title', 'titulo'),
        priority: priority,
        due_at: toLocalIso(payloadText(payload, 'due_date', 'due_at')) ?? null,
        status: 'inbox',
        source: 'ai',
      }
    }
    case 'create_event': {
      const rawStart = payloadText(payload, 'start_at', 'starts_at', 'date', 'due_at')
      if (!rawStart) return null
      return {
        user_id: userId,
        title: payloadTextOr(payload, 'Evento', 'title', 'description', 'titulo'),
        start_at: toLocalIso(rawStart),
        end_at: toLocalIso(payloadText(payload, 'end_at', 'ends_at')) ?? null,
        source: 'ai',
      }
    }
    case 'create_habit': {
      return {
        user_id: userId,
        name: payloadText(payload, 'name', 'nombre'),
        frequency: payloadText(payload, 'frequency', 'frecuencia') ?? 'daily',
        active: true,
      }
    }
    case 'create_project': {
      return {
        user_id: userId,
        name: payloadText(payload, 'name', 'nombre'),
        description: payloadText(payload, 'description') ?? null,
        due_at: toLocalIso(payloadText(payload, 'due_date', 'fecha_limite')) ?? null,
        status: 'active',
      }
    }
    case 'add_wishlist_item': {
      return {
        user_id: userId,
        name: payloadText(payload, 'name', 'nombre'),
        price: firstPayloadValue(payload, 'price', 'precio') ?? null,
        store: payloadText(payload, 'store', 'tienda') ?? null,
        url: payloadText(payload, 'url') ?? null,
        status: 'wanted',
      }
    }
    case 'create_debt': {
      return {
        user_id: userId,
        name: payloadTextOr(payload, 'Deuda', 'name', 'nombre'),
        person: payloadTextOr(payload, 'Alguien', 'person', 'persona'),
        type: payloadText(payload, 'type') === 'i_owe' ? 'i_owe' : 'owed_to_me',
        total_amount: Math.abs(payloadNumber(payload, 0, 'amount', 'monto')),
        paid_amount: 0,
        currency: 'ARS',
        status: 'pending',
      }
    }
    case 'create_recipe': {
      return {
        user_id: userId,
        name: payloadTextOr(payload, 'Receta sin nombre', 'name', 'nombre'),
        instructions: payloadText(payload, 'instructions', 'instrucciones') ?? null,
        calories: firstPayloadValue(payload, 'calories', 'calorias') ?? null,
        diet_tags: payloadStringArray(payload, 'diet_tags'),
        is_favorite: false,
      }
    }
    case 'log_meal': {
      const mealTypeMap: Record<string, string> = {
        breakfast: 'desayuno', desayuno: 'desayuno',
        lunch: 'almuerzo', almuerzo: 'almuerzo',
        snack: 'merienda', merienda: 'merienda',
        dinner: 'cena', cena: 'cena',
      }
      const mealType = payloadTextOr(payload, 'almuerzo', 'meal_type').toLowerCase()
      return {
        user_id: userId,
        description: payloadTextOr(payload, 'Comida registrada', 'description', 'descripcion'),
        calories: firstPayloadValue(payload, 'calories', 'calorias') ?? null,
        meal_type: mealTypeMap[mealType] || 'almuerzo',
        logged_at: toLocalIso(payloadText(payload, 'date', 'fecha')) ?? new Date().toISOString(),
      }
    }
    case 'add_pantry_item': {
      return {
        user_id: userId,
        name: payloadTextOr(payload, 'Producto', 'name', 'nombre'),
        quantity: payloadNumber(payload, 1, 'quantity', 'cantidad'),
        unit: payloadTextOr(payload, 'unidades', 'unit', 'unidad'),
        min_stock: payloadNumber(payload, 0, 'min_stock'),
      }
    }
    case 'add_to_shopping_list': {
      return {
        user_id: userId,
        name: payloadTextOr(payload, 'Item', 'name', 'nombre'),
        quantity: payloadNumber(payload, 1, 'quantity', 'cantidad'),
        unit: payloadText(payload, 'unit', 'unidad') ?? null,
      }
    }
    default:
      return null
  }
}

/** Human-readable confirmation message per intent */
function buildMessage(intent: string, payload: AiActionPayload): string {
  switch (intent) {
    case 'create_expense': return `Gasto registrado: ${payloadTextOr(payload, 'Sin descripción', 'description', 'descripcion', 'comercio', 'merchant')} $${Math.abs(payloadNumber(payload, 0, 'amount', 'monto')).toLocaleString('es-AR')}`
    case 'create_task': return `Tarea creada: ${payloadTextOr(payload, 'Sin título', 'title', 'titulo')}`
    case 'create_event': return `Evento agendado: ${payloadTextOr(payload, 'Sin título', 'title', 'titulo')}`
    case 'create_habit': return `Hábito registrado: ${payloadTextOr(payload, 'Sin nombre', 'name', 'nombre')}`
    case 'create_note': return `Nota guardada`
    case 'create_project': return `Proyecto creado: ${payloadTextOr(payload, 'Sin nombre', 'name', 'nombre')}`
    case 'add_wishlist_item': return `Agregado a wishlist: ${payloadTextOr(payload, 'Sin nombre', 'name', 'nombre')}`
    case 'create_debt': return `Deuda registrada con ${payloadTextOr(payload, 'Alguien', 'person', 'persona')}: $${Math.abs(payloadNumber(payload, 0, 'amount', 'monto')).toLocaleString('es-AR')}`
    case 'create_recipe': return `Receta creada: ${payloadTextOr(payload, 'Sin nombre', 'name', 'nombre')}`
    case 'log_meal': return `Comida registrada: ${payloadTextOr(payload, 'Sin descripción', 'description', 'descripcion')}`
    case 'add_pantry_item': return `Agregado a despensa: ${payloadTextOr(payload, 'Sin nombre', 'name', 'nombre')} (${payloadTextOr(payload, '1', 'quantity')} ${payloadTextOr(payload, 'u', 'unit')})`
    case 'add_to_shopping_list': return `Agregado a lista de compras: ${payloadTextOr(payload, 'Sin nombre', 'name', 'nombre')}`
    default: return `Dato registrado.`
  }
}

/**
 * Executes an AI-detected action (intent) against the database.
 */
export async function executeAiAction(
  userId: string,
  action: { type: string; payload: unknown },
  supabaseClient?: SupabaseClient
): Promise<{ success: boolean; message: string; recordId?: string; undoId?: string }> {
  const { type: intent } = action
  const payload = normalizePayload(action.payload)
  const table = getAiActionTable(intent)
  const validation = validateAiActionPayload(intent, payload)

  if (!table) {
    return { success: false, message: `No sé cómo manejar la acción "${intent}"` }
  }

  if (!validation.success) {
    return { success: false, message: validation.message }
  }

  let supabase = supabaseClient
  if (!supabase) {
    supabase = await createClient()
  }

  const row = await buildAiActionRow(intent, validation.payload, userId, supabase)
  if (!row) {
    return { success: false, message: 'No pude construir el registro con los datos provistos.' }
  }

  const { data: inserted, error: dbError } = await supabase
    .from(table)
    .insert(row)
    .select('id')
    .single()

  if (dbError) {
    logger.error(`[executeAiAction] Error inserting into ${table}:`, dbError)
    return { success: false, message: `Error al guardar: ${dbError.message}` }
  }

  const recordId = inserted?.id as string
  let undoId: string | undefined

  // Store undo payload in Redis if available
  if (redis) {
    undoId = `undo:${userId}:${recordId}`
    const undoPayload: UndoPayload = {
      userId,
      table,
      recordId,
      action: 'insert',
      timestamp: Date.now(),
    }
    await redis.set(undoId, JSON.stringify(undoPayload), { ex: UNDO_TTL_SECONDS }).catch(e => {
        logger.error("Redis error in executeAiAction:", e);
    })
  }

  return {
    success: true,
    message: buildMessage(intent, payload),
    recordId,
    undoId,
  }
}
