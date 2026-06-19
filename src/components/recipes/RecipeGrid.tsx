"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChefHat, Loader2, Plus, Search, Star } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { ModuleHeader } from "@/components/layout/module-header"
import { Button } from "@/components/ui/button"
import { RecipeCard, type RecipeCardData } from "./RecipeCard"
import { RecipeDetail } from "./RecipeDetail"
import { RecipeForm } from "./RecipeForm"

type DietFilter = "omnivoro" | "vegetariano" | "vegano" | "sin_gluten"

interface RecipeListQuery {
  limit: number
  offset: number
  search?: string
  diet?: DietFilter
  favorite?: boolean
}

const dietFilters: Array<{ value?: DietFilter; label: string }> = [
  { value: undefined, label: "Todas" },
  { value: "omnivoro", label: "Omnivoro" },
  { value: "vegetariano", label: "Vegetariano" },
  { value: "vegano", label: "Vegano" },
  { value: "sin_gluten", label: "Sin Gluten" },
]

export function RecipeGrid() {
  const [showForm, setShowForm] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<{
    diet?: DietFilter
    favorite?: boolean
  }>({})

  const utils = trpc.useUtils()

  const queryInput: RecipeListQuery = {
    limit: 50,
    offset: 0,
  }
  if (search) queryInput.search = search
  if (filters.diet) queryInput.diet = filters.diet
  if (filters.favorite !== undefined) queryInput.favorite = filters.favorite

  const { data: recipes, isLoading } = trpc.recipes.list.useQuery(queryInput)
  const recipeRows = (recipes ?? []) as RecipeCardData[]

  if (selectedRecipe) {
    return (
      <RecipeDetail
        recipeId={selectedRecipe}
        onBack={() => setSelectedRecipe(null)}
      />
    )
  }

  return (
    <div className="space-y-4">
      <ModuleHeader
        module="Recetas"
        title="Recetas"
        description={`${recipeRows.length} receta${recipeRows.length !== 1 ? "s" : ""}`}
        className="pt-0"
        actions={
        <Button
          size="sm"
          onClick={() => setShowForm(true)}
          className="gap-1.5 cursor-pointer"
          id="add-recipe-btn"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nueva receta</span>
        </Button>
        }
      />

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar recetas..."
            className="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-1 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            id="recipe-search"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {dietFilters.map((filter) => (
            <button
              type="button"
              key={filter.value ?? "all"}
              onClick={() => setFilters((prev) => ({ ...prev, diet: filter.value }))}
              aria-label={`Filtrar recetas por ${filter.label}`}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                filters.diet === filter.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {filter.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                favorite: prev.favorite === true ? undefined : true,
              }))
            }
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
              filters.favorite
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <Star className="h-3 w-3" />
            Favoritas
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : recipeRows.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence>
            {recipeRows.map((recipe, index) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                index={index}
                onClick={() => setSelectedRecipe(recipe.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <ChefHat className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No hay recetas{search ? " que coincidan" : ""}</p>
          <Button
            variant="outline"
            className="mt-4 cursor-pointer"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear primera receta
          </Button>
        </motion.div>
      )}

      <RecipeForm
        open={showForm}
        onOpenChange={setShowForm}
        onSuccess={() => {
          utils.recipes.list.invalidate()
          setShowForm(false)
        }}
      />
    </div>
  )
}
