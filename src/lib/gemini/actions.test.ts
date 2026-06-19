import { describe, expect, it, vi } from 'vitest'
import { buildAiActionRow, executeAiAction, getAiActionTable, validateAiActionPayload } from './actions'

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/redis', () => ({
  redis: null,
}))

vi.mock('@/lib/finanzas/categories', () => ({
  suggestCategory: vi.fn(() => 'General'),
}))

describe('AI action database contract', () => {
  const validPayloads = [
    ['create_expense', { amount: 4800, description: 'Supermercado' }],
    ['create_task', { title: 'Estudiar algebra' }],
    ['create_event', { title: 'Clase', start_at: '2026-07-10' }],
    ['create_habit', { name: 'Leer' }],
    ['create_note', { content: 'Idea para despues' }],
    ['create_project', { name: 'Final SO' }],
    ['add_wishlist_item', { name: 'Auriculares' }],
    ['create_debt', { person: 'Marcos', amount: 5000 }],
    ['create_recipe', { name: 'Pasta con salsa' }],
    ['log_meal', { description: 'Pasta', meal_type: 'cena' }],
    ['add_pantry_item', { name: 'Arroz', quantity: 2 }],
    ['add_to_shopping_list', { name: 'Leche', quantity: 1 }],
  ] as const

  it.each(validPayloads)('validates payloads for %s', (intent, payload) => {
    expect(validateAiActionPayload(intent, payload)).toMatchObject({ success: true })
  })

  it.each([
    ['create_expense', { description: 'Cafe' }],
    ['create_task', { priority: 'high' }],
    ['create_event', { title: 'Clase' }],
    ['create_habit', { frequency: 'daily' }],
    ['add_pantry_item', { quantity: 2 }],
  ] as const)('rejects incomplete payloads for %s', (intent, payload) => {
    expect(validateAiActionPayload(intent, payload)).toMatchObject({ success: false })
  })

  it('does not call Supabase when payload validation fails', async () => {
    const single = vi.fn(async () => ({ data: { id: 'record-id' }, error: null }))
    const select = vi.fn(() => ({ single }))
    const insert = vi.fn(() => ({ select }))
    const supabase = { from: vi.fn(() => ({ insert })) }

    const result = await executeAiAction(
      'user-id',
      { type: 'create_expense', payload: { description: 'Cafe' } },
      supabase as never
    )

    expect(result).toMatchObject({ success: false })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('maps create_habit to the existing active column', async () => {
    const row = await buildAiActionRow('create_habit', { name: 'Leer' }, 'user-id')

    expect(row).toMatchObject({
      user_id: 'user-id',
      name: 'Leer',
      frequency: 'daily',
      active: true,
    })
    expect(row).not.toHaveProperty('is_active')
  })

  it('maps create_project to due_at instead of due_date', async () => {
    const row = await buildAiActionRow(
      'create_project',
      { name: 'Final SO', due_date: '2026-07-10' },
      'user-id'
    )

    expect(row).toMatchObject({
      user_id: 'user-id',
      name: 'Final SO',
      due_at: '2026-07-10T12:00:00-03:00',
      status: 'active',
    })
    expect(row).not.toHaveProperty('due_date')
  })

  it('uses PRD wishlist status values', async () => {
    const row = await buildAiActionRow(
      'add_wishlist_item',
      { name: 'Auriculares', price: 120000 },
      'user-id'
    )

    expect(row).toMatchObject({
      user_id: 'user-id',
      name: 'Auriculares',
      price: 120000,
      status: 'wanted',
    })
  })

  it('maps create_event to calendar_events per PRD', () => {
    expect(getAiActionTable('create_event')).toBe('calendar_events')
  })

  it('builds calendar event rows with start_at, end_at and source', async () => {
    const row = await buildAiActionRow(
      'create_event',
      { title: 'Clase', start_at: '2026-07-10', end_at: '2026-07-10T14:00:00-03:00' },
      'user-id'
    )

    expect(row).toMatchObject({
      user_id: 'user-id',
      title: 'Clase',
      start_at: '2026-07-10T12:00:00-03:00',
      end_at: '2026-07-10T14:00:00-03:00',
      source: 'ai',
    })
    expect(row).not.toHaveProperty('trigger_at')
    expect(row).not.toHaveProperty('trigger_end_at')
  })

  it('does not map notes to a table that has no migration', () => {
    expect(getAiActionTable('create_note')).toBeNull()
  })
})
