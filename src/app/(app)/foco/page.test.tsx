import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import FocoPage from './page'

vi.mock('@/components/focus/pomodoro-timer', () => ({
  PomodoroTimer: () => <section>Temporizador foco activo</section>,
}))

describe('FocoPage', () => {
  it('renders the dedicated pomodoro experience instead of a placeholder', () => {
    const html = renderToStaticMarkup(<FocoPage />)

    expect(html).toContain('Temporizador foco activo')
    expect(html).not.toContain('Pendiente en Roadmap')
  })
})
