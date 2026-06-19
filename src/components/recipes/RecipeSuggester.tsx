"use client"

import { AnimatePresence, motion } from "framer-motion"
import {
  AlertTriangle,
  ChefHat,
  Lightbulb,
  Loader2,
  ShoppingCart,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { trpc } from "@/lib/trpc"
import { ModuleHeader } from "@/components/layout/module-header"

interface SuggestedRecipe {
  id: string
  name: string
  calories: number | null
}

interface MissingIngredient {
  name: string
  needed: number
  available: number
  unit: string
}

interface AlmostPossibleRecipe extends SuggestedRecipe {
  missingIngredients: MissingIngredient[]
}

interface RecipeSuggestions {
  possible: SuggestedRecipe[]
  almostPossible: AlmostPossibleRecipe[]
}

export function RecipeSuggester() {
  const utils = trpc.useUtils()
  const { data: suggestions, isLoading } = trpc.recipes.getSuggestions.useQuery()
  const suggestionRows = (suggestions ?? { possible: [], almostPossible: [] }) as RecipeSuggestions

  const addToShoppingList = trpc.shoppingList.create.useMutation({
    onSuccess: () => toast.success("Agregado a lista de compras"),
    onSettled: () => utils.shoppingList.list.invalidate(),
    onError: (error) => toast.error("Error", { description: error.message }),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const possible = suggestionRows.possible
  const almostPossible = suggestionRows.almostPossible

  return (
    <div className="space-y-6">
      <ModuleHeader
        module="Recetas"
        title="Sugeridor"
        description="Sugerencias desde tu inventario disponible."
        className="pt-0"
      />

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ChefHat className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-medium uppercase tracking-wider">
            Podés hacer ahora
          </h2>
          <span className="text-xs text-muted-foreground">({possible.length})</span>
        </div>

        {possible.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <AnimatePresence>
              {possible.map((recipe, index) => (
                <motion.div
                  key={recipe.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <ChefHat className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{recipe.name}</p>
                    {recipe.calories !== null && recipe.calories !== undefined && (
                      <p className="text-xs text-muted-foreground">{recipe.calories} kcal</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No hay recetas que puedas hacer con el inventario actual
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <h2 className="text-sm font-medium uppercase tracking-wider">
            Te falta poco
          </h2>
          <span className="text-xs text-muted-foreground">({almostPossible.length})</span>
        </div>

        {almostPossible.length > 0 ? (
          <div className="space-y-2">
            <AnimatePresence>
              {almostPossible.map((recipe, index) => (
                <motion.div
                  key={recipe.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="rounded-lg border border-border/50 bg-card p-3 space-y-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                      <ChefHat className="h-5 w-5 text-warning" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{recipe.name}</p>
                      {recipe.calories !== null && recipe.calories !== undefined && (
                        <p className="text-xs text-muted-foreground">{recipe.calories} kcal</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pl-[52px]">
                    {recipe.missingIngredients.map((missing) => {
                      const missingQuantity = missing.needed - missing.available
                      return (
                        <button
                          type="button"
                          key={`${recipe.id}-${missing.name}`}
                          onClick={() =>
                            addToShoppingList.mutate({
                              name: missing.name,
                              quantity: missingQuantity,
                              unit: missing.unit,
                            })
                          }
                          aria-label={`Agregar ${missing.name} a la lista de compras`}
                          className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning cursor-pointer hover:bg-warning/20 transition-colors"
                        >
                          <ShoppingCart className="h-2.5 w-2.5" />
                          {missing.name}: {missingQuantity} {missing.unit}
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No hay recetas cercanas a completar
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-medium uppercase tracking-wider">
            Sugerencias de Acrue
          </h2>
        </div>
        <div className="rounded-lg border border-dashed border-border/50 p-6 text-center">
          <Lightbulb className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-30" />
          <p className="text-sm text-muted-foreground">
            Las sugerencias de IA se generan segun tu inventario y preferencias
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Usa el chatbot o Cmd+K para pedir sugerencias personalizadas
          </p>
        </div>
      </div>
    </div>
  )
}
