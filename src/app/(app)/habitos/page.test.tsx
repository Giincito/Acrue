import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import HabitosPage from './page'

vi.mock('@/components/habits/habit-list-view', () => ({
  HabitListView: () => <section>Hábitos activos</section>,
}))

vi.mock('next/navigation', () => ({
  redirect: (href: string) => {
    throw new Error(`redirect:${href}`)
  },
}))

describe('HabitosPage', () => {
  it('renders the canonical habits module instead of redirecting to itself', () => {
    const html = renderToStaticMarkup(<HabitosPage />)

    expect(html).toContain('Hábitos activos')
  })
})
