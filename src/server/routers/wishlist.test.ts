import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addXP } from '@/lib/xp'
import { appRouter } from './_app'

vi.mock('@/lib/xp', () => ({
  addXP: vi.fn(),
}))

const ITEM_ID = '33333333-3333-4333-8333-333333333333'

type TableName = 'wishlist_items' | 'expenses'

type WishlistRow = {
  id: string
  user_id: string
  name: string
  description: string | null
  price: number | null
  currency: string
  store: string | null
  url: string | null
  priority: number
  status: 'wanted' | 'saved' | 'purchased'
  created_at: string
}

type ExpenseRow = {
  id: string
  user_id: string
  amount: number
  date: string
  deleted_at?: string | null
}

type Filter =
  | { op: 'eq'; column: string; value: unknown }
  | { op: 'is'; column: string; value: unknown }
  | { op: 'gte'; column: string; value: string }
  | { op: 'lt'; column: string; value: string }

type SupabaseState = {
  wishlist_items: WishlistRow[]
  expenses: ExpenseRow[]
}

class QueryBuilder {
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private payload: Record<string, unknown> | null = null
  private filters: Filter[] = []

  constructor(
    private readonly table: TableName,
    private readonly state: SupabaseState
  ) {}

  select() {
    return this
  }

  insert(payload: Record<string, unknown>) {
    this.action = 'insert'
    this.payload = payload
    return this
  }

  update(payload: Record<string, unknown>) {
    this.action = 'update'
    this.payload = payload
    return this
  }

  delete() {
    this.action = 'delete'
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push({ op: 'eq', column, value })
    return this
  }

  is(column: string, value: unknown) {
    this.filters.push({ op: 'is', column, value })
    return this
  }

  gte(column: string, value: string) {
    this.filters.push({ op: 'gte', column, value })
    return this
  }

  lt(column: string, value: string) {
    this.filters.push({ op: 'lt', column, value })
    return this
  }

  order() {
    return this
  }

  single() {
    return Promise.resolve(this.resolveSingle(false))
  }

  maybeSingle() {
    return Promise.resolve(this.resolveSingle(true))
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return Promise.resolve(this.resolveMany()).then(onfulfilled, onrejected)
  }

  private resolveMany() {
    if (this.action === 'insert') {
      const row = {
        id: `generated-${this.state[this.table].length + 1}`,
        created_at: '2026-06-16T12:00:00.000Z',
        ...this.payload,
      }
      this.state[this.table].push(row as never)
      return { data: row, error: null }
    }

    if (this.action === 'update') {
      const rows = this.matchingRows()
      rows.forEach((row) => Object.assign(row, this.payload))
      return { data: rows, error: null }
    }

    if (this.action === 'delete') {
      const rows = this.matchingRows()
      this.state[this.table] = this.state[this.table].filter((row) => !rows.includes(row as never)) as never
      return { data: rows, error: null }
    }

    return { data: this.matchingRows(), error: null }
  }

  private resolveSingle(allowEmpty: boolean) {
    const result = this.resolveMany()
    const rows = Array.isArray(result.data) ? result.data : [result.data]
    const data = rows[0] ?? null

    if (!data && !allowEmpty) {
      return { data: null, error: { message: 'No rows returned' } }
    }

    return { data, error: null }
  }

  private matchingRows() {
    return this.state[this.table].filter((row) =>
      this.filters.every((filter) => {
        const value = row[filter.column as keyof typeof row]
        if (filter.op === 'eq') return value === filter.value
        if (filter.op === 'is') return value == null && filter.value === null
        if (filter.op === 'gte') return String(value) >= filter.value
        return String(value) < filter.value
      })
    )
  }
}

function createSupabaseMock(initial?: Partial<SupabaseState>) {
  const state: SupabaseState = {
    wishlist_items: initial?.wishlist_items ?? [],
    expenses: initial?.expenses ?? [],
  }

  return {
    state,
    supabase: {
      from(table: TableName) {
        return new QueryBuilder(table, state)
      },
    },
  }
}

function createCaller(supabase: unknown) {
  return appRouter.createCaller({
    supabase,
    user: { id: 'user-1' },
  } as never)
}

describe('wishlistRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates wishlist items scoped to the authenticated user', async () => {
    const { supabase, state } = createSupabaseMock()
    const caller = createCaller(supabase)

    const item = await caller.wishlist.create({
      name: 'Monitor',
      price: 120000,
      currency: 'ARS',
      priority: 1,
    })

    expect(item).toMatchObject({
      user_id: 'user-1',
      name: 'Monitor',
      price: 120000,
      currency: 'ARS',
      priority: 1,
      status: 'wanted',
    })
    expect(state.wishlist_items).toHaveLength(1)
  })

  it('awards XP once when an item moves to purchased', async () => {
    const { supabase } = createSupabaseMock({
      wishlist_items: [
        {
          id: ITEM_ID,
          user_id: 'user-1',
          name: 'Monitor',
          description: null,
          price: 120000,
          currency: 'ARS',
          store: null,
          url: null,
          priority: 1,
          status: 'wanted',
          created_at: '2026-06-16T12:00:00.000Z',
        },
      ],
    })
    const caller = createCaller(supabase)

    await caller.wishlist.update({
      id: ITEM_ID,
      status: 'purchased',
    })

    expect(addXP).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'wishlist',
      ITEM_ID,
      20,
      'Compra planificada: Monitor'
    )
  })

  it('suggests purchases by crossing item price with current monthly balance', async () => {
    const { supabase } = createSupabaseMock({
      wishlist_items: [
        {
          id: ITEM_ID,
          user_id: 'user-1',
          name: 'Monitor',
          description: null,
          price: 250,
          currency: 'ARS',
          store: null,
          url: null,
          priority: 1,
          status: 'wanted',
          created_at: '2026-06-16T12:00:00.000Z',
        },
      ],
      expenses: [
        {
          id: 'income-1',
          user_id: 'user-1',
          amount: 500,
          date: '2026-06-05',
          deleted_at: null,
        },
        {
          id: 'expense-1',
          user_id: 'user-1',
          amount: -200,
          date: '2026-06-10',
          deleted_at: null,
        },
      ],
    })
    const caller = createCaller(supabase)

    const suggestions = await caller.wishlist.suggestions({
      year: 2026,
      month: 6,
    })

    expect(suggestions).toEqual({
      availableBalance: 300,
      currency: 'ARS',
      aiSummary: null,
      items: [
        expect.objectContaining({
          id: ITEM_ID,
          canBuy: true,
          remainingAfterPurchase: 50,
        }),
      ],
    })
  })
})
