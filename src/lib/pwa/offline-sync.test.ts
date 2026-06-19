import { describe, expect, it, vi } from 'vitest'
import { applyQueuedOfflineActions } from './offline-sync'
import type { QueuedOfflineAction } from './offline-actions'

describe('offline action server sync', () => {
  it('dispatches queued task and expense creation through the app caller', async () => {
    const tasksCreate = vi.fn(async () => ({ id: 'task-id' }))
    const expensesCreate = vi.fn(async () => ({ id: 'expense-id' }))
    const actions: QueuedOfflineAction[] = [
      {
        id: 'task-action',
        type: 'tasks.create',
        payload: { title: 'Offline task' },
        createdAt: '2026-06-15T14:00:00.000Z',
        attempts: 0,
      },
      {
        id: 'expense-action',
        type: 'expenses.create',
        payload: { amount: -1200, date: '2026-06-15' },
        createdAt: '2026-06-15T14:05:00.000Z',
        attempts: 0,
      },
    ]

    const results = await applyQueuedOfflineActions({
      tasks: { create: tasksCreate },
      expenses: { create: expensesCreate },
    }, actions)

    expect(tasksCreate).toHaveBeenCalledWith({ title: 'Offline task' })
    expect(expensesCreate).toHaveBeenCalledWith({ amount: -1200, date: '2026-06-15' })
    expect(results).toEqual([
      { id: 'task-action', ok: true },
      { id: 'expense-action', ok: true },
    ])
  })

  it('keeps processing the batch when one queued action fails', async () => {
    const tasksCreate = vi.fn(async () => {
      throw new Error('Titulo invalido')
    })
    const expensesCreate = vi.fn(async () => ({ id: 'expense-id' }))
    const actions: QueuedOfflineAction[] = [
      {
        id: 'task-action',
        type: 'tasks.create',
        payload: { title: '' },
        createdAt: '2026-06-15T14:00:00.000Z',
        attempts: 0,
      },
      {
        id: 'expense-action',
        type: 'expenses.create',
        payload: { amount: -1200, date: '2026-06-15' },
        createdAt: '2026-06-15T14:05:00.000Z',
        attempts: 0,
      },
    ]

    const results = await applyQueuedOfflineActions({
      tasks: { create: tasksCreate },
      expenses: { create: expensesCreate },
    }, actions)

    expect(expensesCreate).toHaveBeenCalledOnce()
    expect(results).toEqual([
      { id: 'task-action', ok: false, error: 'Titulo invalido' },
      { id: 'expense-action', ok: true },
    ])
  })
})
