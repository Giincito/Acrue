/** All intent types the AI router can detect */
export type IntentType =
  | 'gasto'
  | 'ingreso'
  | 'tarea'
  | 'evento'
  | 'habito'
  | 'receta'
  | 'nota'
  | 'proyecto'
  | 'wishlist'
  | 'desconocido'

/** Structured response from Gemini intent detection */
export interface IntentResult {
  intent: IntentType
  /** 0.0 – 1.0 */
  confidence: number
  payload: IntentPayload
  rawText: string
}

/** Shape of the router API response */
export interface RouterResponse {
  /** True when Gemini was confident (>90%) and row was inserted automatically */
  executed: boolean
  /** Client-facing message describing what happened */
  message: string
  /** The Supabase record id — present when executed=true */
  recordId?: string
  /** Undo key stored in Redis — used by UndoToast */
  undoId?: string
  /** Preview payload for confirmation UI when confidence ≤90% */
  preview?: IntentPayload
  intent?: IntentType
  confidence?: number
}

/** Undo payload stored in Redis with 5s TTL */
export interface UndoPayload {
  userId: string
  table: string
  recordId: string
  action: 'insert' | 'update'
  timestamp: number
}

// ----------- Intent-specific payloads -----------

export interface GastoPayload {
  descripcion: string
  monto: number
  categoria?: string
  fecha?: string
  metodo_pago?: string
}

export interface TareaPayload {
  titulo: string
  descripcion?: string
  prioridad?: 'urgente' | 'normal' | 'bajo'
  due_at?: string
  etiqueta?: string
}

export interface EventoPayload {
  titulo: string
  descripcion?: string
  starts_at: string
  ends_at?: string
  ubicacion?: string
}

export interface HabitoPayload {
  nombre: string
  frecuencia?: string
}

export interface NotaPayload {
  contenido: string
  titulo?: string
}

export interface ProyectoPayload {
  nombre: string
  descripcion?: string
  fecha_limite?: string
}

export interface WishlistPayload {
  nombre: string
  precio?: number
  tienda?: string
  url?: string
}

export type IntentPayload =
  | GastoPayload
  | TareaPayload
  | EventoPayload
  | HabitoPayload
  | NotaPayload
  | ProyectoPayload
  | WishlistPayload
  | Record<string, unknown>

/** Message shape for chatbot conversation history */
export interface ChatMessage {
  role: 'user' | 'model'
  content: string
}

/** Receipt data extracted by Gemini Vision */
export interface ReceiptData {
  comercio: string
  monto: number
  items: Array<{ nombre: string; precio?: number; cantidad?: number }>
  fecha: string
  metodo_pago?: string
}
