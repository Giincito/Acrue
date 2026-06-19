import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ModuleHeader } from './module-header'

describe('ModuleHeader', () => {
  it('renders the parent module eyebrow above the active submodule title', () => {
    const html = renderToStaticMarkup(
      <ModuleHeader module="Tareas" title="Hoy" description="Tareas activas para completar." />
    )

    expect(html).toContain('Tareas')
    expect(html).toContain('Hoy')
    expect(html.indexOf('Tareas')).toBeLessThan(html.indexOf('Hoy'))
    expect(html).toContain('Tareas activas para completar.')
  })

  it('keeps the optional action in the same header region', () => {
    const html = renderToStaticMarkup(
      <ModuleHeader module="Finanzas" title="Gastos" actions={<button type="button">Nuevo gasto</button>} />
    )

    expect(html).toContain('Finanzas')
    expect(html).toContain('Gastos')
    expect(html).toContain('Nuevo gasto')
  })
})
