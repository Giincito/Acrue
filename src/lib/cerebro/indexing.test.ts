import { describe, expect, it, vi } from 'vitest'
import {
  cleanupNotebookEmbeddings,
  indexNotebook,
  searchSimilar,
  type NotebookIndexInput,
} from './indexing'

type SupabaseCall = {
  table?: string
  action: string
  payload?: unknown
  filters?: Array<{ column: string; value: unknown }>
}

class QueryBuilder {
  private filters: Array<{ column: string; value: unknown }> = []

  constructor(
    private readonly table: string,
    private readonly calls: SupabaseCall[]
  ) {}

  upsert(payload: unknown) {
    this.calls.push({ table: this.table, action: 'upsert', payload })
    return this
  }

  delete() {
    this.calls.push({ table: this.table, action: 'delete', filters: this.filters })
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value })
    return this
  }

  select() {
    return this
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return Promise.resolve({ data: [], error: null }).then(onfulfilled, onrejected)
  }
}

function createSupabaseMock() {
  const calls: SupabaseCall[] = []

  return {
    calls,
    supabase: {
      from(table: string) {
        return new QueryBuilder(table, calls)
      },
      rpc(name: string, payload: unknown) {
        calls.push({ action: `rpc:${name}`, payload })
        return Promise.resolve({
          data: [
            {
              notebook_id: 'notebook-1',
              note_id: 'note-1',
              title: 'Consenso',
              snippet: 'Raft usa lider para replicar entradas.',
              source_url: 'https://example.com/note-1',
              similarity: 0.82,
            },
          ],
          error: null,
        })
      },
    },
  }
}

describe('cerebro indexing', () => {
  it('indexes notebook notes as pgvector rows with display metadata', async () => {
    const { supabase, calls } = createSupabaseMock()
    const input: NotebookIndexInput = {
      notebookId: 'notebook-1',
      notebookTitle: 'Distribuidos',
      notes: [
        {
          id: 'note-1',
          title: 'Consenso',
          content: 'Raft usa lider para replicar entradas en sistemas distribuidos.',
          sourceUrl: 'https://example.com/note-1',
        },
      ],
    }

    const result = await indexNotebook(supabase as never, 'user-1', input, async () => [0.1, 0.2])

    expect(result).toEqual({ indexedCount: 1, notebookId: 'notebook-1', notebookTitle: 'Distribuidos' })
    expect(calls[0]).toMatchObject({ table: 'note_embeddings', action: 'upsert' })
    expect(calls[0].payload).toEqual([
      expect.objectContaining({
        user_id: 'user-1',
        notebook_id: 'notebook-1',
        notebook_title: 'Distribuidos',
        note_id: 'note-1',
        title: 'Consenso',
        snippet: 'Raft usa lider para replicar entradas en sistemas distribuidos.',
        source_url: 'https://example.com/note-1',
        embedding: '[0.1,0.2]',
      }),
    ])
  })

  it('uses the similarity RPC with a pgvector query', async () => {
    const { supabase, calls } = createSupabaseMock()

    const results = await searchSimilar(supabase as never, 'user-1', [0.1, 0.2], 5)

    expect(calls[0]).toEqual({
      action: 'rpc:match_note_embeddings',
      payload: {
        p_user_id: 'user-1',
        p_query_embedding: '[0.1,0.2]',
        p_limit: 5,
      },
    })
    expect(results[0]).toMatchObject({ title: 'Consenso', similarity: 0.82 })
  })

  it('deletes embeddings by notebook and optionally by note', async () => {
    const { supabase, calls } = createSupabaseMock()

    await cleanupNotebookEmbeddings(supabase as never, 'user-1', {
      notebookId: 'notebook-1',
      noteId: 'note-1',
    })

    expect(calls[0]).toMatchObject({ table: 'note_embeddings', action: 'delete' })
    expect(calls[0].filters).toEqual([
      { column: 'user_id', value: 'user-1' },
      { column: 'notebook_id', value: 'notebook-1' },
      { column: 'note_id', value: 'note-1' },
    ])
  })

  it('rejects empty notebooks before generating embeddings', async () => {
    const { supabase } = createSupabaseMock()
    const generator = vi.fn()

    await expect(
      indexNotebook(supabase as never, 'user-1', { notebookId: 'empty', notes: [] }, generator)
    ).rejects.toThrow('Notebook sin notas para indexar.')
    expect(generator).not.toHaveBeenCalled()
  })
})
