import { readFileSync } from "fs"
import { join } from "path"
import { describe, expect, it } from "vitest"

describe("recipe form UI spacing", () => {
  const source = readFileSync(join(process.cwd(), "src/components/recipes/RecipeForm.tsx"), "utf8")

  it("uses shared spacing classes for labeled fields", () => {
    expect(source).toContain("RECIPE_FORM_FIELD_CLASS")
    expect(source).toContain("RECIPE_FORM_LABEL_CLASS")
    expect(source).toContain("RECIPE_FORM_INPUT_CLASS")
    expect(source).toContain("RECIPE_FORM_TEXTAREA_CLASS")
    expect(source).not.toContain("space-y-1.5")
  })

  it("keeps text controls comfortable enough for touch and readable spacing", () => {
    expect(source).toContain("min-h-11")
    expect(source).toContain("space-y-2.5")
    expect(source).toContain("rounded-lg")
  })
})
