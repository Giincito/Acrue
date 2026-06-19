import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const selectorSourceFiles = [
  "src/components/reminders/create-reminder-form.tsx",
  "src/components/reminders/reminder-details-drawer.tsx",
  "src/components/tasks/task-details-drawer.tsx",
  "src/components/shared/generic-color-select.tsx",
  "src/lib/generic-colors.ts",
]

function readSelectorSources() {
  return selectorSourceFiles
    .map((file) => join(process.cwd(), file))
    .filter((file) => existsSync(file))
    .map((file) => readFileSync(file, "utf8"))
    .join("\n")
}

describe("event color selectors", () => {
  it("uses generic color labels instead of internal theme labels", () => {
    const source = readSelectorSources()
    const genericLabels = ["Rojo", "Azul", "Verde", "Amarillo", "Naranja", "Violeta", "Rosa", "Verde oscuro", "Celeste"]
    const internalThemeLabels = ["Linen", "Ash", "Stone", "Acento", "Slate", "Core"]

    for (const label of genericLabels) {
      expect(source).toContain(label)
    }

    for (const label of internalThemeLabels) {
      expect(source).not.toContain(label)
    }
  })

  it("applies selected colors to reminder and task calendar events", () => {
    const source = readFileSync(join(process.cwd(), "src/components/calendar/calendar-view.tsx"), "utf8")

    expect(source).toContain("const taskColor")
    expect(source).toContain("const reminderColor")
    expect(source).toContain("taskColorToneMap[taskColor]")
    expect(source).toContain("taskColorToneMap[reminderColor]")
  })
})
