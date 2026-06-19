"use client"

/* eslint-disable @next/next/no-img-element -- Recipe images are user-provided URLs, so next/image host allowlists would reject valid saved data. */

import { motion } from "framer-motion"
import {
  AlertTriangle,
  ArrowLeft,
  ChefHat,
  Flame,
  Loader2,
  Package,
  Star,
} from "lucide-react"
import { toast } from "sonner"
import { trpc } from "@/lib/trpc"
import { cn } from "@/lib/utils"
import { ModuleEyebrow } from "@/components/layout/module-header"
import { showUndoToast } from "@/components/ui/undo-toast"
import { Button } from "@/components/ui/button"

interface RecipeDetailProps {
  recipeId: string
  onBack: () => void
}

interface PantryIngredient {
  id: string
  name: string | null
  quantity: number | string | null
  unit: string | null
}

interface RecipeIngredient {
  id: string
  quantity: number | string | null
  unit: string | null
  is_optional?: boolean | null
  pantry_items: PantryIngredient | PantryIngredient[] | null
}

interface RecipeDetailData {
  id: string
  name: string
  image_url: string | null
  calories: number | null
  diet_tags: string[] | null
  instructions: string | null
  is_favorite: boolean
  recipe_ingredients?: RecipeIngredient[] | null
}

const dietLabels: Record<string, string> = {
  vegetariano: "Vegetariano",
  vegano: "Vegano",
  sin_gluten: "Sin Gluten",
  omnivoro: "Omnivoro",
}

const getPantryIngredient = (ingredient: RecipeIngredient) => {
  const pantryItems = ingredient.pantry_items
  if (Array.isArray(pantryItems)) return pantryItems[0] ?? null
  return pantryItems
}

export function RecipeDetail({ recipeId, onBack }: RecipeDetailProps) {
  const utils = trpc.useUtils()
  const { data: recipeData, isLoading } = trpc.recipes.getById.useQuery({ id: recipeId })
  const recipe = recipeData as RecipeDetailData | undefined

  const toggleFavorite = trpc.recipes.toggleFavorite.useMutation({
    onSettled: () => {
      utils.recipes.getById.invalidate({ id: recipeId })
      utils.recipes.list.invalidate()
    },
  })

  const cookRecipe = trpc.recipes.cook.useMutation({
    onSuccess: (result) => {
      const deductionSummary = result.deductions
        .map((deduction) => `${deduction.name}: -${deduction.amount}`)
        .join(", ")

      showUndoToast({
        message: deductionSummary
          ? `${result.recipeName} cocinada - ${deductionSummary}`
          : `${result.recipeName} cocinada`,
        onUndo: () => {
          utils.pantryItems.list.invalidate()
        },
      })
    },
    onSettled: () => {
      utils.pantryItems.list.invalidate()
    },
    onError: (error) => toast.error("Error al cocinar", { description: error.message }),
  })

  const deleteRecipe = trpc.recipes.delete.useMutation({
    onSuccess: () => {
      toast.success("Receta eliminada")
      onBack()
    },
    onSettled: () => utils.recipes.list.invalidate(),
    onError: (error) => toast.error("Error", { description: error.message }),
  })

  if (isLoading || !recipe) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const ingredients = recipe.recipe_ingredients ?? []
  const dietTags = recipe.diet_tags ?? []

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <ModuleEyebrow>Recetas</ModuleEyebrow>
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Volver a recetas"
          onClick={onBack}
          className="cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-medium flex-1">{recipe.name}</h1>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={recipe.is_favorite ? "Quitar de favoritos" : "Agregar a favoritos"}
          onClick={() => toggleFavorite.mutate({ id: recipeId })}
          className="cursor-pointer"
        >
          <Star
            className={`h-5 w-5 ${
              recipe.is_favorite ? "fill-primary text-primary" : "text-muted-foreground"
            }`}
          />
        </Button>
      </div>

      {recipe.image_url && (
        <div className="rounded-xl overflow-hidden h-48 border">
          <img
            src={recipe.image_url}
            alt={recipe.name}
            className="w-full h-full object-cover filter grayscale"
          />
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        {recipe.calories !== null && recipe.calories !== undefined && (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium">
            <Flame className="h-3.5 w-3.5" />
            {recipe.calories} kcal
          </span>
        )}
        {dietTags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-muted px-3 py-1 text-xs font-medium"
          >
            {dietLabels[tag] ?? tag}
          </span>
        ))}
      </div>

      {ingredients.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Ingredientes
          </h2>
          <div className="space-y-1">
            {ingredients.map((ingredient) => {
              const pantry = getPantryIngredient(ingredient)
              const available = pantry ? Number(pantry.quantity) : 0
              const needed = Number(ingredient.quantity)
              const isOptional = ingredient.is_optional ?? false
              const isInsufficient = available < needed

              return (
                <div
                  key={ingredient.id}
                  className="flex items-center justify-between rounded-lg border border-border/50 p-2.5"
                >
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{pantry?.name ?? "Item desconocido"}</span>
                    {isOptional && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Opcional
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs font-mono", isInsufficient && !isOptional ? "text-warning" : "text-muted-foreground")}>
                      {needed} {ingredient.unit}
                    </span>
                    {isInsufficient && !isOptional && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-warning">
                        <AlertTriangle className="h-3 w-3" />
                        Falta
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {recipe.instructions && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Instrucciones
          </h2>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="text-sm text-foreground/80 whitespace-pre-wrap">{recipe.instructions}</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 pt-2">
        <Button
          onClick={() => cookRecipe.mutate({ id: recipeId })}
          disabled={cookRecipe.isPending}
          className="gap-1.5 cursor-pointer flex-1"
          id="cook-recipe-btn"
        >
          {cookRecipe.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChefHat className="h-4 w-4" />
          )}
          Cocinar ahora
        </Button>
        <Button
          variant="outline"
          onClick={() => deleteRecipe.mutate({ id: recipeId })}
          disabled={deleteRecipe.isPending}
          className="text-destructive hover:text-destructive cursor-pointer"
        >
          Eliminar
        </Button>
      </div>
    </motion.div>
  )
}
