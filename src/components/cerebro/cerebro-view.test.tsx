import React from 'react'
import { readFileSync } from 'fs'
import { join } from 'path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { CerebroView } from './cerebro-view'

let searchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
}))

vi.mock('@/components/focus/pomodoro-timer', () => ({
  PomodoroTimer: () => <section>Foco principal activo</section>,
}))

describe('CerebroView', () => {
  const source = readFileSync(join(process.cwd(), 'src/components/cerebro/cerebro-view.tsx'), 'utf8')

  it('opens with Focus as the primary study submodule', () => {
    searchParams = new URLSearchParams()
    const html = renderToStaticMarkup(<CerebroView />)

    expect(html).toContain('Foco principal activo')
    expect(html).toContain('Cerebro')
    expect(html).not.toContain('aria-label="Submodulos de Cerebro"')
    expect(html).not.toContain('Centro de estudio')
  })

  it('renders the review submodule from the side-panel query route', () => {
    searchParams = new URLSearchParams('tab=repaso')
    const html = renderToStaticMarkup(<CerebroView />)

    expect(html).toContain('Repaso activo')
    expect(html).not.toContain('Foco principal activo')
  })

  it('renders review as an interactive checklist with progress controls', () => {
    searchParams = new URLSearchParams('tab=repaso')
    const html = renderToStaticMarkup(<CerebroView />)

    expect(html).toContain('0 de 4 pasos')
    expect(html).toContain('Marcar paso 1 como hecho')
    expect(html).toContain('Reiniciar repaso')
    expect(source).toContain('completedReviewSteps')
    expect(source).toContain('toggleReviewStep')
    expect(source).toContain('reviewProgress')
  })

  it('handles indexing mutation failures inside the submit handler', () => {
    expect(source).toContain('try {')
    expect(source).toContain('await indexMutation.mutateAsync')
    expect(source).toContain('catch (error)')
    expect(source).toContain('setFormError(getCerebroErrorMessage(error')
  })
})
