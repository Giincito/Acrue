import { describe, expect, it, vi } from 'vitest'
import { getSuggestedRecipes } from './suggester'

function createSupabaseMock(dataByTable: Record<string, unknown[]>) {
  return {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(async () => ({ data: dataByTable[table] ?? [], error: null })),
      })),
    })),
  }
}

describe('getSuggestedRecipes', () => {
  it('ignores missing optional ingredients when deciding if a recipe is possible', async () => {
    const supabase = createSupabaseMock({
      recipes: [
        {
          id: 'recipe-1',
          name: 'Pasta simple',
          calories: null,
          diet_tags: ['vegetariano'],
          is_favorite: false,
          image_url: null,
          recipe_ingredients: [
            {
              id: 'ingredient-1',
              pantry_item_id: 'pantry-pasta',
              quantity: 1,
              unit: 'paquete',
              is_optional: false,
            },
            {
              id: 'ingredient-2',
              pantry_item_id: 'pantry-oregano',
              quantity: 1,
              unit: 'cdita',
              is_optional: true,
            },
          ],
        },
      ],
      pantry_items: [
        {
          id: 'pantry-pasta',
          name: 'Pasta',
          quantity: 1,
          unit: 'paquete',
        },
        {
          id: 'pantry-oregano',
          name: 'Oregano',
          quantity: 0,
          unit: 'cdita',
        },
      ],
    })

    const result = await getSuggestedRecipes('user-1', supabase as never)

    expect(result.possible).toHaveLength(1)
    expect(result.possible[0].name).toBe('Pasta simple')
    expect(result.possible[0].missingIngredients).toEqual([])
    expect(result.almostPossible).toEqual([])
  })
})
