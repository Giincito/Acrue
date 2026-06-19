import { readFileSync } from "fs"
import { join } from "path"
import { describe, expect, it } from "vitest"

describe("select shared UI states", () => {
  const source = readFileSync(join(process.cwd(), "src/components/ui/select.tsx"), "utf8")
  const itemSource = source.slice(
    source.indexOf("function SelectItem"),
    source.indexOf("function SelectSeparator")
  )
  const contentSource = source.slice(
    source.indexOf("function SelectContent"),
    source.indexOf("function SelectLabel")
  )

  it("opens the list flush with the trigger so the input does not peek behind it", () => {
    expect(contentSource).toContain("sideOffset = 0")
    expect(contentSource).not.toContain("sideOffset = 4")
  })

  it("applies theme-aware hover and focus states to every select option", () => {
    expect(itemSource).toContain("hover:bg-foreground/[0.06]")
    expect(itemSource).toContain("dark:hover:bg-foreground/[0.09]")
    expect(itemSource).toContain("focus:bg-foreground/[0.06]")
    expect(itemSource).toContain("dark:focus:bg-foreground/[0.09]")
    expect(itemSource).toContain("transition-colors")
  })

  it("keeps selectable options visibly interactive without changing disabled behavior", () => {
    expect(itemSource).toContain("cursor-pointer")
    expect(itemSource).toContain("data-disabled:cursor-not-allowed")
    expect(itemSource).not.toContain("cursor-default")
  })
})
