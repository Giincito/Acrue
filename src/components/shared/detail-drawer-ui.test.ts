import { readFileSync } from "fs"
import { join } from "path"
import { describe, expect, it } from "vitest"

const drawerFiles = [
  "src/components/tasks/task-details-drawer.tsx",
  "src/components/reminders/reminder-details-drawer.tsx",
]

describe("detail drawer field UI", () => {
  const sources = drawerFiles.map((file) => ({
    file,
    source: readFileSync(join(process.cwd(), file), "utf8"),
  }))

  it("uses rounded padded title fields instead of square completed inputs", () => {
    for (const { source } of sources) {
      expect(source).toContain("DETAIL_TITLE_INPUT_CLASS")
      expect(source).toContain("rounded-xl")
      expect(source).toContain("px-3")
      expect(source).toContain("min-h-11")
      expect(source).not.toContain("rounded-none shadow-none focus-visible:ring-0 h-auto")
    }
  })

  it("uses padded select triggers without negative alignment hacks", () => {
    for (const { source } of sources) {
      expect(source).toContain("DETAIL_SELECT_TRIGGER_CLASS")
      expect(source).not.toContain("py-0 px-1")
      expect(source).not.toContain("-ml-1")
    }
  })

  it("uses comfortable date and time controls", () => {
    for (const { source } of sources) {
      expect(source).toContain("DETAIL_TIME_INPUT_CLASS")
      expect(source).not.toContain("h-8 border-0 shadow-none px-1 py-0")
    }
  })
})
