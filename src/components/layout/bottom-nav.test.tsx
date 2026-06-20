import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { BottomNav } from './bottom-nav'

vi.mock('next/navigation', () => ({
  usePathname: () => '/tareas',
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} className={className} {...props}>{children}</a>
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

  it('opens a mobile module drawer with every platform module reachable', () => {
    const html = renderToStaticMarkup(<BottomNav initialMoreOpen />)

    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-labelledby="mobile-module-nav-title"')
    expect(html).toContain('href="/calendario"')
    expect(html).toContain('href="/tareas/proyectos"')
    expect(html).toContain('href="/foco"')
    expect(html).toContain('href="/estudio"')
    expect(html).toContain('href="/cerebro"')
    expect(html).toContain('href="/despensa"')
    expect(html).toContain('href="/recetas"')
    expect(html).toContain('href="/habitos"')
    expect(html).toContain('href="/wishlist"')
    expect(html).toContain('href="/configuracion"')
  })

  it('keeps the active tab dimensional without using flat filled icons', () => {
    const html = renderToStaticMarkup(<BottomNav />)

    expect(html).toContain('data-active="true"')
    expect(html).toContain('bg-accent/10')
    expect(html).toContain('ring-1')
    expect(html).not.toContain('fill-current opacity-20')
  })

  it('prevents horizontal overflow in the mobile navigation surface', () => {
    const html = renderToStaticMarkup(<BottomNav initialMoreOpen />)

    expect(html).toContain('overflow-x-hidden')
    expect(html).not.toContain('overflow-x-auto')
    expect(html).not.toContain('min-w-max')
  })
})
