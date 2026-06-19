import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const shellPath = join(process.cwd(), 'src/components/layout/module-shell.tsx')
const moduleRouterFiles = [
  'src/components/finances/FinanceTabs.tsx',
  'src/components/pantry/PantryTabs.tsx',
  'src/components/recipes/RecipeTabs.tsx',
]
const canonicalModuleFiles = [
  'src/app/(app)/calendario/page.tsx',
  'src/app/(app)/cerebro/page.tsx',
  'src/app/(app)/configuracion/page.tsx',
  'src/app/(app)/estudio/page.tsx',
  'src/app/(app)/estudio/materias/[id]/page.tsx',
  'src/app/(app)/tareas/page.tsx',
  'src/app/(app)/tareas/etiquetas/page.tsx',
  'src/app/(app)/tareas/papelera/page.tsx',
  'src/app/(app)/tareas/prioridades/page.tsx',
  'src/app/(app)/tareas/proyectos/page.tsx',
  'src/components/habits/habit-list-view.tsx',
  'src/components/wishlist/wishlist-view.tsx',
]

describe('Module shell layout contract', () => {
  it('provides the canonical module page wrapper', () => {
    expect(existsSync(shellPath)).toBe(true)

    const source = readFileSync(shellPath, 'utf8')
    expect(source).toContain('flex-1 w-full h-full bg-background lg:p-4')
    expect(source).toContain('mx-auto space-y-6 pb-20 lg:pb-8 relative min-h-[calc(100vh-80px)] px-4 lg:px-0 pt-4 lg:pt-0')
  })

  it('uses the shared shell in query-driven module routers', () => {
    const violations = moduleRouterFiles.flatMap((relativePath) => {
      const source = readFileSync(join(process.cwd(), relativePath), 'utf8')
      const usesShell = source.includes('@/components/layout/module-shell') && source.includes('<ModuleShell')
      const ownsPagePadding = source.includes('className="p-4 md:p-6"')

      return usesShell && !ownsPagePadding ? [] : [relativePath]
    })

    expect(violations).toEqual([])
  })

  it('uses the shared shell in canonical app modules', () => {
    const violations = canonicalModuleFiles.flatMap((relativePath) => {
      const source = readFileSync(join(process.cwd(), relativePath), 'utf8')
      const usesShell = source.includes('@/components/layout/module-shell') && source.includes('<ModuleShell')
      const ownsCanonicalWrapper = source.includes('flex-1 w-full h-full bg-background lg:p-4')

      return usesShell && !ownsCanonicalWrapper ? [] : [relativePath]
    })

    expect(violations).toEqual([])
  })
})
