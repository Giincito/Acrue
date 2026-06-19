import { readFileSync } from "fs"
import { join } from "path"
import { describe, expect, it } from "vitest"

describe("create task form UI spacing", () => {
  const source = readFileSync(join(process.cwd(), "src/components/tasks/create-task-form.tsx"), "utf8")

  it("uses shared classes for title input and option pills", () => {
    expect(source).toContain("CREATE_TASK_TITLE_ROW_CLASS")
    expect(source).toContain("CREATE_TASK_TITLE_INPUT_CLASS")
    expect(source).toContain("CREATE_TASK_CHIP_GRID_CLASS")
    expect(source).toContain("CREATE_TASK_CHIP_TRIGGER_CLASS")
    expect(source).toContain("CREATE_TASK_CHIP_BUTTON_CLASS")
  })

  it("keeps pills aligned with comfortable touch targets", () => {
    expect(source).toContain("grid-cols-[repeat(auto-fit,minmax(132px,1fr))]")
    expect(source).toContain("min-h-11")
    expect(source).not.toContain("h-8 text-xs w-[")
    expect(source).not.toContain("pl-1 pr-2 h-auto")
  })
})
