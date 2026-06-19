import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  join(process.cwd(), 'src/components/habits/habit-list-view.tsx'),
  'utf8'
)

describe('HabitListView UI contract', () => {
  it('uses themed choice controls instead of native selects', () => {
    expect(source).not.toContain('<select')
    expect(source).not.toContain('</select>')
  })

  it('does not render habit submodule navigation inside the content area', () => {
    expect(source).not.toContain('TabsList')
    expect(source).not.toContain('TabsTrigger')
    expect(source).not.toContain('SubmoduleNav')
    expect(source).not.toContain('MODULE_ITEMS')
    expect(source).not.toContain('aria-label="Submodulos de habitos"')
  })

  it('reads the active habit view from the route query', () => {
    expect(source).toContain('useSearchParams')
    expect(source).toContain('const activeView = getHabitView(searchParams.get("view"))')
  })

  it('uses an inset ring for the current heatmap day to avoid clipped outlines', () => {
    expect(source).not.toContain('outline-offset-1 outline-accent')
    expect(source).toContain('ring-inset ring-1 ring-accent')
  })
})
