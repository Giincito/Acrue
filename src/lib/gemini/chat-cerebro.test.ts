import { describe, expect, it, vi } from 'vitest'
import { answerCerebroQuestion, isCerebroQuestion } from './chat'

vi.mock('@/lib/gemini/client', () => ({
  callGemini: vi.fn(async () => ({
    text: JSON.stringify({ message: 'Raft aparece como mecanismo de consenso con lider.' }),
    fromCache: false,
  })),
}))

vi.mock('@/lib/cerebro/embeddings', () => ({
  generateEmbedding: vi.fn(async () => [0.1, 0.2]),
}))

vi.mock('@/lib/cerebro/indexing', () => ({
  searchSimilar: vi.fn(async () => [
    {
      notebookId: 'dist',
      notebookTitle: 'Sistemas distribuidos',
      noteId: 'raft',
      title: 'Raft',
      snippet: 'Raft usa un lider para replicar entradas.',
      sourceUrl: 'https://example.com/raft',
      similarity: 0.88,
    },
  ]),
}))

describe('chat cerebro integration', () => {
  it('detects natural language notebook questions', () => {
    expect(isCerebroQuestion('@cerebro sistemas distribuidos')).toBe(true)
    expect(isCerebroQuestion('que anotamos sobre raft?')).toBe(true)
    expect(isCerebroQuestion('crea una tarea para mañana')).toBe(false)
  })

  it('answers using semantic notebook search results', async () => {
    const answer = await answerCerebroQuestion('user-1', 'que anotamos sobre raft?', {} as never)

    expect(answer).toEqual({
      reply: 'Raft aparece como mecanismo de consenso con lider.',
      sources: [
        {
          notebookId: 'dist',
          notebookTitle: 'Sistemas distribuidos',
          noteId: 'raft',
          title: 'Raft',
          snippet: 'Raft usa un lider para replicar entradas.',
          sourceUrl: 'https://example.com/raft',
          similarity: 0.88,
        },
      ],
    })
  })
})
