import type { SupabaseClient } from '@supabase/supabase-js'
import { createContentHash, generateEmbedding, toPgVector } from './embeddings'

export type NotebookNoteInput = {
  id: string
  title?: string | null
  content: string
  sourceUrl?: string | null
  metadata?: Record<string, unknown> | null
}

export type NotebookIndexInput = {
  notebookId: string
  notebookTitle?: string | null
  notes: NotebookNoteInput[]
}

export type CerebroSearchResult = {
  notebookId: string
  notebookTitle: string | null
  noteId: string
  title: string | null
  snippet: string
  sourceUrl: string | null
  similarity: number
}

type SearchRpcRow = {
  notebook_id: string
  notebook_title: string | null
  note_id: string
  title: string | null
  snippet: string | null
  source_url: string | null
  similarity: number | null
}

type EmbeddingGenerator = (text: string) => Promise<number[]>

function normalizeSnippet(content: string) {
  const compact = content.replace(/\s+/g, ' ').trim()
  if (compact.length <= 220) return compact
  return `${compact.slice(0, 217).trim()}...`
}

export async function indexNotebook(
  supabase: SupabaseClient,
  userId: string,
  input: NotebookIndexInput,
  embeddingGenerator: EmbeddingGenerator = generateEmbedding
) {
  const validNotes = input.notes.filter((note) => note.id.trim() && note.content.trim())

  if (!validNotes.length) {
    throw new Error('Notebook sin notas para indexar.')
  }

  const rows = await Promise.all(validNotes.map(async (note) => {
    const embedding = await embeddingGenerator(note.content)

    return {
      user_id: userId,
      notebook_id: input.notebookId,
      notebook_title: input.notebookTitle ?? null,
      note_id: note.id,
      title: note.title ?? null,
      snippet: normalizeSnippet(note.content),
      source_url: note.sourceUrl ?? null,
      metadata: note.metadata ?? {},
      content_hash: createContentHash(note.content),
      embedding: toPgVector(embedding),
    }
  }))

  const { error } = await supabase
    .from('note_embeddings')
    .upsert(rows, { onConflict: 'user_id,notebook_id,note_id' })

  if (error) {
    throw new Error(error.message)
  }

  return {
    indexedCount: rows.length,
    notebookId: input.notebookId,
    notebookTitle: input.notebookTitle ?? null,
  }
}

export async function searchSimilar(
  supabase: SupabaseClient,
  userId: string,
  queryEmbedding: number[],
  limit = 6
): Promise<CerebroSearchResult[]> {
  const { data, error } = await supabase.rpc('match_note_embeddings', {
    p_user_id: userId,
    p_query_embedding: toPgVector(queryEmbedding),
    p_limit: limit,
  })

  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as SearchRpcRow[]).map((row) => ({
    notebookId: row.notebook_id,
    notebookTitle: row.notebook_title,
    noteId: row.note_id,
    title: row.title,
    snippet: row.snippet ?? '',
    sourceUrl: row.source_url,
    similarity: Number(row.similarity ?? 0),
  }))
}

export async function cleanupNotebookEmbeddings(
  supabase: SupabaseClient,
  userId: string,
  input: { notebookId: string; noteId?: string | null }
) {
  let query = supabase
    .from('note_embeddings')
    .delete()
    .eq('user_id', userId)
    .eq('notebook_id', input.notebookId)

  if (input.noteId) {
    query = query.eq('note_id', input.noteId)
  }

  const { error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return {
    deleted: true,
    notebookId: input.notebookId,
    noteId: input.noteId ?? null,
  }
}
