/** All intent types the AI router can detect */
export type IntentType =
  | 'create_expense'
  | 'create_task'
  | 'create_event'
  | 'create_habit'
  | 'create_note'
  | 'create_project'
  | 'add_wishlist_item'
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
  description: string
  amount: number
  category?: string
  date?: string
  payment_method?: string
}

export interface TareaPayload {
  title: string
  due_at?: string
  priority?: number
  context_tag?: string
}

export interface EventoPayload {
  title: string
  description?: string
  starts_at: string
  ends_at?: string
  location?: string
}

export interface HabitoPayload {
  name: string
  frequency?: string
}

export interface NotaPayload {
  content: string
  title?: string
}

export interface ProyectoPayload {
  name: string
  description?: string
  due_date?: string
}

export interface WishlistPayload {
  name: string
  price?: number
  store?: string
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
