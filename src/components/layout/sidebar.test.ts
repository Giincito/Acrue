import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  join(process.cwd(), 'src/components/layout/sidebar.tsx'),
  'utf8'
)
const tasksPageSource = readFileSync(
  join(process.cwd(), 'src/app/(app)/tareas/page.tsx'),
  'utf8'
)
const studyPageSource = readFileSync(
  join(process.cwd(), 'src/app/(app)/estudio/page.tsx'),
  'utf8'
)
const cerebroPageSource = readFileSync(
  join(process.cwd(), 'src/components/cerebro/cerebro-view.tsx'),
  'utf8'
)
const calendarViewSource = readFileSync(
  join(process.cwd(), 'src/components/calendar/calendar-view.tsx'),
  'utf8'
)
const habitListSource = readFileSync(
  join(process.cwd(), 'src/components/habits/habit-list-view.tsx'),
  'utf8'
)
const financeSubmoduleSources = [
  'FinanceDashboard.tsx',
  'ExpenseList.tsx',
  'DebtList.tsx',
  'SubscriptionList.tsx',
  'SavingGoalsList.tsx',
].map((file) => readFileSync(join(process.cwd(), 'src/components/finances', file), 'utf8'))
const pantrySubmoduleSources = [
  'PantryInventory.tsx',
  'ShoppingList.tsx',
  'PriceComparator.tsx',
].map((file) => readFileSync(join(process.cwd(), 'src/components/pantry', file), 'utf8'))
const recipeSubmoduleSources = [
  'RecipeGrid.tsx',
  'RecipeSuggester.tsx',
  'MealTracker.tsx',
  'MealPlanView.tsx',
].map((file) => readFileSync(join(process.cwd(), 'src/components/recipes', file), 'utf8'))

describe('Sidebar module navigation contract', () => {
  it('exposes habit submodules in the side panel', () => {
    expect(source).toContain('id: "habitos"')
    expect(source).toContain('href: "/habitos?view=today"')
    expect(source).toContain('href: "/habitos?view=week"')
    expect(source).toContain('href: "/habitos?view=month"')
    expect(source).toContain('href: "/habitos?view=year"')
    expect(source).toContain('href: "/habitos?view=xp"')
  })

  it('exposes task and study submodules in the side panel instead of page tabs', () => {
    expect(source).toContain('href: "/tareas?tab=today"')
    expect(source).toContain('href: "/tareas?tab=upcoming"')
    expect(source).toContain('href: "/tareas?tab=completed"')
    expect(source).toContain('href: "/estudio?tab=promedio"')
    expect(source).toContain('href: "/estudio?tab=horarios"')
    expect(source).toContain('href: "/estudio?tab=campus"')

    expect(tasksPageSource).not.toContain('TabsList')
    expect(tasksPageSource).not.toContain('TabsTrigger')
    expect(studyPageSource).not.toContain('TabsList')
    expect(studyPageSource).not.toContain('TabsTrigger')
  })

  it('exposes Cerebro submodules in the side panel instead of page tabs', () => {
    expect(source).toContain('id: "cerebro"')
    expect(source).toContain('href: "/cerebro"')
    expect(source).toContain('href: "/cerebro?tab=repaso"')
    expect(source).toContain('href: "/cerebro?tab=apuntes"')

    expect(cerebroPageSource).not.toContain('aria-label="Submódulos de Cerebro"')
    expect(cerebroPageSource).not.toContain('setActiveTab')
    expect(cerebroPageSource).not.toContain('CEREBRO_TABS')
  })

  it('groups task list views under a nested side-panel section', () => {
    expect(source).toContain('name: "Vistas"')
    expect(source).toContain('children: [')
    expect(source.indexOf('name: "Vistas"')).toBeLessThan(source.indexOf('href: "/tareas?tab=today"'))
    expect(source.indexOf('href: "/tareas?tab=completed"')).toBeLessThan(source.indexOf('href: "/tareas/proyectos"'))
  })

  it('labels sidebar-driven submodules with the parent module eyebrow', () => {
    expect(tasksPageSource).toContain('TASK_TAB_COPY')
    expect(tasksPageSource).toContain('module="Tareas"')
    expect(studyPageSource).toContain('STUDY_TAB_COPY')
    expect(studyPageSource).toContain('module="Estudio"')
    expect(cerebroPageSource).toContain('module="Cerebro"')
    expect(calendarViewSource).toContain('module="Calendario"')
    expect(habitListSource).toContain('HABIT_VIEW_COPY')
    expect(habitListSource).toContain('module="Hábitos"')
    for (const submoduleSource of financeSubmoduleSources) {
      expect(submoduleSource).toContain('module="Finanzas"')
    }
    for (const submoduleSource of pantrySubmoduleSources) {
      expect(submoduleSource).toContain('module="Despensa"')
    }
    for (const submoduleSource of recipeSubmoduleSources) {
      expect(submoduleSource).toContain('module="Recetas"')
    }
  })
})
