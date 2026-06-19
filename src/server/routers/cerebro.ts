import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { generateEmbedding } from '@/lib/cerebro/embeddings'
import { getCerebroErrorMessage } from '@/lib/cerebro/errors'
import { cleanupNotebookEmbeddings, indexNotebook, searchSimilar } from '@/lib/cerebro/indexing'
import { protectedProcedure, router } from '../trpc'

const noteSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional().nullable(),
  content: z.string().min(1),
  sourceUrl: z.string().url().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
})

const indexNotebookSchema = z.object({
  notebookId: z.string().min(1),
  notebookTitle: z.string().optional().nullable(),
  notes: z.array(noteSchema).min(1),
})

export const cerebroRouter = router({
  notebooks: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('note_embeddings')
      .select('notebook_id, notebook_title, note_id, created_at')
      .eq('user_id', ctx.user.id)
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    const notebookMap = new Map<string, {
      notebookId: string
      notebookTitle: string | null
      noteCount: number
      updatedAt: string | null
    }>()

    ;(data ?? []).forEach((row) => {
      const current = notebookMap.get(row.notebook_id)
      if (!current) {
        notebookMap.set(row.notebook_id, {
          notebookId: row.notebook_id,
          notebookTitle: row.notebook_title,
          noteCount: 1,
          updatedAt: row.created_at,
        })
        return
      }

      current.noteCount += 1
      if (row.created_at && (!current.updatedAt || row.created_at > current.updatedAt)) {
        current.updatedAt = row.created_at
      }
    })

    return Array.from(notebookMap.values())
  }),

  index: protectedProcedure
    .input(indexNotebookSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await indexNotebook(ctx.supabase, ctx.user.id, input)
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: getCerebroErrorMessage(error, 'No se pudo indexar el notebook.'),
        })
      }
    }),

  search: protectedProcedure
    .input(z.object({
      query: z.string().min(1),
      limit: z.number().int().min(1).max(12).default(6),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const embedding = await generateEmbedding(input.query)
        return await searchSimilar(ctx.supabase, ctx.user.id, embedding, input.limit)
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: getCerebroErrorMessage(error, 'No se pudo buscar en Cerebro.'),
        })
      }
    }),

  cleanup: protectedProcedure
    .input(z.object({
      notebookId: z.string().min(1),
      noteId: z.string().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await cleanupNotebookEmbeddings(ctx.supabase, ctx.user.id, input)
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'No se pudo limpiar el notebook.',
        })
      }
    }),
})
