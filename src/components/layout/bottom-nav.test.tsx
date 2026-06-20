import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { BottomNav } from './bottom-nav'

vi.mock('next/navigation', () => ({
  usePathname: () => '/tareas',
  useRouter: () => ({ prefetch: vi.fn() }),
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

  it('uses Tareas and Finanzas as the default configurable featured slots', () => {
    const html = renderToStaticMarkup(<BottomNav />)
    const tasksIndex = html.indexOf('data-featured-slot="left"')
    const commandIndex = html.indexOf('data-command-trigger="true"')
    const financesIndex = html.indexOf('data-featured-slot="right"')

    expect(html).toContain('aria-label="Ir a Tareas"')
    expect(html).toContain('aria-label="Ir a Finanzas"')
    expect(tasksIndex).toBeGreaterThan(-1)
    expect(commandIndex).toBeGreaterThan(tasksIndex)
    expect(financesIndex).toBeGreaterThan(commandIndex)
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

  it('keeps the module drawer grouped while customization stays separate', () => {
    const html = renderToStaticMarkup(<BottomNav initialMoreOpen />)
    const drawerHtml = html.slice(html.indexOf('id="mobile-module-nav"'))

    expect(drawerHtml).toContain('General')
    expect(drawerHtml).toContain('Productividad')
    expect(drawerHtml).toContain('Educación')
    expect(drawerHtml).toContain('Vida')
    expect(drawerHtml).toContain('Sistema')
    expect(drawerHtml.indexOf('General')).toBeLessThan(drawerHtml.indexOf('Calendario'))
    expect(drawerHtml.indexOf('Productividad')).toBeLessThan(drawerHtml.indexOf('Tareas'))
    expect(drawerHtml.indexOf('Educación')).toBeLessThan(drawerHtml.indexOf('Estudio'))
    expect(drawerHtml.indexOf('Vida')).toBeLessThan(drawerHtml.indexOf('Finanzas'))
  })

  it('keeps the active tab compact while separating the indicator from the label', () => {
    const html = renderToStaticMarkup(<BottomNav />)

    expect(html).toContain('data-active="true"')
    expect(html).toContain('bg-accent/10')
    expect(html).toContain('ring-1')
    expect(html).toContain('h-8 w-10')
    expect(html).toContain('-bottom-1')
    expect(html).toContain('justify-center gap-1.5 px-1 pt-1 pb-2')
    expect(html).not.toContain('h-9 w-11')
    expect(html).not.toContain('-bottom-2')
    expect(html).not.toContain('justify-center gap-2 px-1 pt-1 pb-2')
    expect(html).not.toContain('gap-0.5')
    expect(html).not.toContain('fill-current opacity-20')
  })

  it('opens the module customization panel from the drawer overflow action', () => {
    const html = renderToStaticMarkup(<BottomNav initialMoreOpen initialCustomizeOpen />)

    expect(html).toContain('Personalizar')
    expect(html).toContain('Destacados')
    expect(html).toContain('name="featured-left"')
    expect(html).toContain('name="featured-right"')
    expect(html).toContain('Orden')
    expect(html).toContain('aria-label="Subir Tareas"')
    expect(html).toContain('aria-label="Restablecer navegación móvil"')
  })

  it('prevents horizontal overflow in the mobile navigation surface', () => {
    const html = renderToStaticMarkup(<BottomNav initialMoreOpen />)

    expect(html).toContain('overflow-x-hidden')
    expect(html).not.toContain('overflow-x-auto')
    expect(html).not.toContain('min-w-max')
  })
})
