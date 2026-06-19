import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import CerebroPage from './page'

vi.mock('@/components/cerebro/cerebro-view', () => ({
  CerebroView: () => <section>Cerebro semantico activo</section>,
}))

describe('CerebroPage', () => {
  it('renders the semantic notebook module instead of the generic chat', () => {
    const html = renderToStaticMarkup(<CerebroPage />)

    expect(html).toContain('Cerebro semantico activo')
    expect(html).not.toContain('Asistente personal')
  })
})
