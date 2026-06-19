import { describe, expect, it } from 'vitest'
import { buildChatContext } from './chat'

type TableName = 'habits' | 'habit_logs' | 'wishlist_items'

type DataState = Record<TableName, Record<string, unknown>[]>

class QueryBuilder {
  private limitCount: number | null = null

  constructor(
    private readonly table: TableName,
    private readonly state: DataState
  ) {}

  select() {
    return this
  }

  eq() {
    return this
  }

  in() {
    return this
  }

  gte() {
    return this
  }

  lte() {
    return this
  }

  order() {
    return this
  }

  limit(count: number) {
    this.limitCount = count
    return this
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    const rows = this.limitCount ? this.state[this.table].slice(0, this.limitCount) : this.state[this.table]
    return Promise.resolve({ data: rows, error: null }).then(onfulfilled, onrejected)
  }
}

describe('buildChatContext', () => {
  it('includes habits and wishlist data for AI answers', async () => {
    const state: DataState = {
      habits: [
        {
          id: 'habit-1',
          name: 'Leer',
          frequency: 'daily',
          days_of_week: [],
          time_of_day: null,
          active: true,
        },
      ],
      habit_logs: [
        {
          id: 'log-1',
          habit_id: 'habit-1',
          completed_at: '2026-06-16T12:00:00.000Z',
          event_type: 'complete',
        },
      ],
      wishlist_items: [
        {
          id: 'wish-1',
          name: 'Monitor',
          price: 250000,
          currency: 'ARS',
          priority: 1,
          status: 'wanted',
        },
      ],
    }

    const supabase = {
      from(table: TableName) {
        return new QueryBuilder(table, state)
      },
    }

    const context = await buildChatContext('user-1', ['habitos', 'wishlist'], supabase as never)

    expect(context).toContain('HABITOS')
    expect(context).toContain('Leer')
    expect(context).toContain('WISHLIST')
    expect(context).toContain('Monitor')
  })
})
