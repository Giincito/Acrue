import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

const MOTION_CRITICAL_FILES = [
  'src/components/ui/button.tsx',
  'src/components/ui/progress.tsx',
  'src/components/ui/switch.tsx',
  'src/components/ui/tabs.tsx',
  'src/components/ui/theme-toggle.tsx',
  'src/components/layout/sidebar.tsx',
  'src/components/tasks/task-item.tsx',
  'src/components/tasks/task-details-drawer.tsx',
  'src/components/projects/project-list-view.tsx',
  'src/components/ui/chatbot-fab.tsx',
  'src/components/reminders/reminder-list-view.tsx',
  'src/components/recipes/RecipeCard.tsx',
  'src/components/recipes/MealTracker.tsx',
  'src/components/finances/ReceiptScanner.tsx',
  'src/components/estudio/subject-list.tsx',
  'src/components/estudio/moodle-feed.tsx',
]

const TAB_ROUTER_FILES = [
  'src/app/(app)/tareas/page.tsx',
  'src/app/(app)/estudio/page.tsx',
  'src/components/finances/FinanceTabs.tsx',
  'src/components/pantry/PantryTabs.tsx',
  'src/components/recipes/RecipeTabs.tsx',
  'src/components/habits/habit-list-view.tsx',
  'src/components/cerebro/cerebro-view.tsx',
]

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8')
}

describe('motion quality', () => {
  it('keeps shared interactive primitives off transition-all', () => {
    const violations = MOTION_CRITICAL_FILES.filter((file) => readSource(file).includes('transition-all'))

    expect(violations).toEqual([])
  })

  it('uses explicit, reduced-motion-safe press feedback on the base button', () => {
    const button = readSource('src/components/ui/button.tsx')

    expect(button).toContain('transition-[background-color,border-color,color,box-shadow,opacity,transform]')
    expect(button).toContain('active:scale-[0.98]')
    expect(button).toContain('motion-reduce:transition-none')
    expect(button).not.toContain('active:translate-y-px')
  })

  it('keeps progress movement limited to the indicator width', () => {
    const progress = readSource('src/components/ui/progress.tsx')
    const sidebar = readSource('src/components/layout/sidebar.tsx')

    expect(progress).toContain('transition-[width]')
    expect(sidebar).toContain('transition-[width]')
  })

  it('centralizes app and tab transitions on the Design.md motion contract', () => {
    const transitions = readSource('src/components/layout/module-transition.tsx')
    const layout = readSource('src/app/(app)/layout.tsx')
    const template = readSource('src/app/(app)/template.tsx')

    expect(transitions).toContain('export function RouteTransition')
    expect(transitions).toContain('export function TabTransition')
    expect(transitions).toContain('useReducedMotion')
    expect(transitions).toContain('translateX(24px)')
    expect(transitions).toContain('translateX(-12px)')
    expect(transitions).toContain('duration: 0.25')
    expect(transitions).toContain('duration: 0.2')
    expect(transitions).toContain('duration: 0.15')
    expect(transitions).toContain('duration: 0.1')
    expect(transitions).toContain('mode="sync"')
    expect(transitions).not.toContain('mode="wait"')

    expect(layout).toContain('RouteTransition')
    expect(template).not.toContain('motion.div')
    expect(template).not.toContain('initial={{ opacity: 0, y: 8 }}')

    const tabViolations = TAB_ROUTER_FILES.flatMap((file) => {
      const source = readSource(file)
      const issues = [
        source.includes('TabTransition') ? null : 'missing TabTransition',
        source.includes('initial={{ opacity: 0, y: 8 }}') ? 'uses vertical tab slide' : null,
      ].filter(Boolean)

      return issues.length ? [`${file}: ${issues.join(', ')}`] : []
    })

    expect(tabViolations).toEqual([])
  })
})
