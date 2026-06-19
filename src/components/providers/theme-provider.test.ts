import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("ThemeProvider runtime contract", () => {
  const source = readFileSync(join(process.cwd(), "src/components/providers/theme-provider.tsx"), "utf8")
  const themeToggleSource = readFileSync(join(process.cwd(), "src/components/ui/theme-toggle.tsx"), "utf8")
  const sonnerSource = readFileSync(join(process.cwd(), "src/components/ui/sonner.tsx"), "utf8")
  const settingsSource = readFileSync(join(process.cwd(), "src/app/(app)/configuracion/page.tsx"), "utf8")

  it("does not render next-themes scripts inside client components", () => {
    expect(source).not.toContain("next-themes")
    expect(source).not.toContain("<script")
    expect(source).not.toContain("dangerouslySetInnerHTML")
    expect(source).toContain("ThemeContext")
    expect(source).toContain("export function useTheme")
  })

  it("routes app theme consumers through the local provider", () => {
    expect(themeToggleSource).toContain('from "@/components/providers/theme-provider"')
    expect(sonnerSource).toContain('from "@/components/providers/theme-provider"')
    expect(settingsSource).toContain('from "@/components/providers/theme-provider"')
    expect(themeToggleSource).not.toContain("next-themes")
    expect(sonnerSource).not.toContain("next-themes")
    expect(settingsSource).not.toContain("next-themes")
  })
})
