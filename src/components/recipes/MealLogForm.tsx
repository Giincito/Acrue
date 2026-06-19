"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"

interface MealLogFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDate?: string
  onSuccess: () => void
}

const MEAL_TYPES = [
  { value: "desayuno", label: "Desayuno" },
  { value: "almuerzo", label: "Almuerzo" },
  { value: "merienda", label: "Merienda" },
  { value: "cena", label: "Cena" },
  { value: "snack", label: "Snack" },
] as const

type MealType = (typeof MEAL_TYPES)[number]["value"]

interface RecipeOption {
  id: string
  name: string
  calories: number | string | null
}

function getCaloriesValue(value: number | string | null | undefined): number | "" {
  if (value == null) return ""
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : ""
}

export function MealLogForm({ open, onOpenChange, defaultDate, onSuccess }: MealLogFormProps) {
  const formKey = `${open ? "open" : "closed"}-${defaultDate ?? "today"}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <MealLogFormFields key={formKey} defaultDate={defaultDate} onSuccess={onSuccess} />
      </DialogContent>
    </Dialog>
  )
}

function MealLogFormFields({
  defaultDate,
  onSuccess,
}: {
  defaultDate?: string
  onSuccess: () => void
}) {
  const [mode, setMode] = useState<"recipe" | "free">("recipe")
  const [recipeId, setRecipeId] = useState("")
  const [description, setDescription] = useState("")
  const [calories, setCalories] = useState<number | "">("")
  const [mealType, setMealType] = useState<MealType>("almuerzo")
  const [deductIngredients, setDeductIngredients] = useState(false)

  const { data: recipes } = trpc.recipes.list.useQuery()
  const recipeOptions: RecipeOption[] = Array.isArray(recipes) ? recipes : []

  const createMealLog = trpc.mealLog.create.useMutation({
    onSuccess: () => {
      toast.success("Comida registrada")
      onSuccess()
    },
    onError: (err) => toast.error("Error", { description: err.message }),
  })

  const handleRecipeChange = (selectedRecipeId: string) => {
    setRecipeId(selectedRecipeId)
    const recipe = recipeOptions.find((option) => option.id === selectedRecipeId)
    setCalories(getCaloriesValue(recipe?.calories))
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    createMealLog.mutate({
      recipe_id: mode === "recipe" && recipeId ? recipeId : undefined,
      description: mode === "free" ? description : undefined,
      calories: calories !== "" ? Number(calories) : undefined,
      meal_type: mealType,
      logged_at: defaultDate ? `${defaultDate}T${new Date().toTimeString().slice(0, 5)}:00` : undefined,
      deduct_ingredients: deductIngredients,
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Registrar comida</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => setMode("recipe")}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              mode === "recipe" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Desde receta
          </button>
          <button
            type="button"
            onClick={() => setMode("free")}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              mode === "free" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Texto libre
          </button>
        </div>

        {mode === "recipe" ? (
          <div className="space-y-1.5">
            <label htmlFor="meal-recipe" className="text-sm font-medium">
              Receta
            </label>
            <select
              id="meal-recipe"
              value={recipeId}
              onChange={(event) => handleRecipeChange(event.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Seleccionar receta...</option>
              {recipeOptions.map((recipe) => (
                <option key={recipe.id} value={recipe.id}>
                  {recipe.name} {recipe.calories ? `(${recipe.calories} kcal)` : ""}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label htmlFor="meal-desc" className="text-sm font-medium">
              Descripción
            </label>
            <input
              id="meal-desc"
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ej: Tostadas con mermelada"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              autoFocus
            />
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Tipo de comida</label>
          <div className="grid grid-cols-3 gap-1.5">
            {MEAL_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setMealType(type.value)}
                aria-label={`Seleccionar tipo de comida ${type.label}`}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-center ${
                  mealType === type.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="meal-cal" className="text-sm font-medium">
            Calorías (kcal)
          </label>
          <input
            id="meal-cal"
            type="number"
            min={0}
            value={calories}
            onChange={(event) => setCalories(event.target.value ? Number(event.target.value) : "")}
            placeholder={mode === "recipe" ? "Se autocompleta desde la receta" : "Opcional"}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {mode === "recipe" && recipeId && (
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={deductIngredients}
              onChange={(event) => setDeductIngredients(event.target.checked)}
              className="rounded border-input cursor-pointer"
            />
            <span>Descontar ingredientes de la despensa</span>
          </label>
        )}

        <DialogFooter>
          <Button
            type="submit"
            disabled={
              createMealLog.isPending ||
              (mode === "recipe" && !recipeId) ||
              (mode === "free" && !description.trim())
            }
            className="cursor-pointer"
          >
            {createMealLog.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Registrar
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}
