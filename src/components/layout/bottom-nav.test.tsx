import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { BottomNav } from './bottom-nav'

vi.mock('next/navigation', () => ({
  usePathname: () => '/tareas',
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' '),
}))

describe('BottomNav', () => {
  it('renders the Cmd+K trigger as the centered mobile action', () => {
    const html = renderToStaticMarkup(<BottomNav />)

    expect(html).toContain('aria-label="Abrir comando global"')
    expect(html).toContain('data-command-trigger="true"')
    expect(html).toContain('Inicio')
    expect(html).toContain('Tareas')
    expect(html).toContain('Finanzas')
    expect(html).toContain('Más')
  })
})
