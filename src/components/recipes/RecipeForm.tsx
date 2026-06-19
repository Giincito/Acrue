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
import { Loader2, Plus, Trash2 } from "lucide-react"

interface RecipeFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editRecipe?: EditableRecipe
  onSuccess: () => void
}

const DIET_OPTIONS = [
  { value: "omnivoro", label: "Omnívoro" },
  { value: "vegetariano", label: "Vegetariano" },
  { value: "vegano", label: "Vegano" },
  { value: "sin_gluten", label: "Sin Gluten" },
] as const

const RECIPE_FORM_FIELD_CLASS = "space-y-2.5"
const RECIPE_FORM_LABEL_CLASS = "block text-sm font-medium text-foreground"
const RECIPE_FORM_INPUT_CLASS =
  "flex min-h-11 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
const RECIPE_FORM_TEXTAREA_CLASS =
  "flex min-h-28 w-full resize-none rounded-lg border border-input bg-transparent px-3 py-3 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"

type DietTag = (typeof DIET_OPTIONS)[number]["value"]

interface RecipeIngredientFormValue {
  pantry_item_id: string
  quantity: number
  unit: string
  is_optional: boolean
}

interface EditableRecipeIngredient {
  pantry_item_id: string
  quantity: number | string | null
  unit: string | null
  is_optional?: boolean | null
}

interface EditableRecipe {
  id: string
  name: string | null
  instructions: string | null
  calories: number | string | null
  diet_tags: DietTag[] | null
  image_url: string | null
  recipe_ingredients?: EditableRecipeIngredient[] | null
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function getCaloriesValue(value: number | string | null | undefined): number | "" {
  return value == null ? "" : toNumber(value)
}

function getInitialRecipeState(editRecipe?: EditableRecipe) {
  return {
    name: editRecipe?.name ?? "",
    instructions: editRecipe?.instructions ?? "",
    calories: getCaloriesValue(editRecipe?.calories),
    dietTags: editRecipe?.diet_tags ?? [],
    imageUrl: editRecipe?.image_url ?? "",
    ingredients: (editRecipe?.recipe_ingredients ?? []).map((ingredient) => ({
      pantry_item_id: ingredient.pantry_item_id,
      quantity: toNumber(ingredient.quantity),
      unit: ingredient.unit ?? "unidades",
      is_optional: ingredient.is_optional ?? false,
    })),
  }
}

/**
 * Recipe create/edit form with ingredient selector.
 * Ingredients are selected from the user's pantry items.
 */
export function RecipeForm({ open, onOpenChange, editRecipe, onSuccess }: RecipeFormProps) {
  const formKey = `${open ? "open" : "closed"}-${editRecipe?.id ?? "new"}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <RecipeFormFields key={formKey} editRecipe={editRecipe} onSuccess={onSuccess} />
      </DialogContent>
    </Dialog>
  )
}

function RecipeFormFields({
  editRecipe,
  onSuccess,
}: {
  editRecipe?: EditableRecipe
  onSuccess: () => void
}) {
  const initialState = getInitialRecipeState(editRecipe)
  const [name, setName] = useState(initialState.name)
  const [instructions, setInstructions] = useState(initialState.instructions)
  const [calories, setCalories] = useState<number | "">(initialState.calories)
  const [dietTags, setDietTags] = useState<DietTag[]>(initialState.dietTags)
  const [imageUrl, setImageUrl] = useState(initialState.imageUrl)
  const [ingredients, setIngredients] = useState<RecipeIngredientFormValue[]>(
    initialState.ingredients
  )

  const isEditing = Boolean(editRecipe)

  const { data: pantryItems } = trpc.pantryItems.list.useQuery()

  const createRecipe = trpc.recipes.create.useMutation({
    onSuccess: () => {
      toast.success("Receta creada")
      onSuccess()
    },
    onError: (err) => toast.error("Error", { description: err.message }),
  })

  const updateRecipe = trpc.recipes.update.useMutation({
    onSuccess: () => {
      toast.success("Receta actualizada")
      onSuccess()
    },
    onError: (err) => toast.error("Error", { description: err.message }),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const data = {
      name: name.trim(),
      instructions: instructions || null,
      calories: calories !== "" ? Number(calories) : null,
      diet_tags: dietTags,
      image_url: imageUrl || null,
      ingredients,
    }

    if (isEditing && editRecipe) {
      updateRecipe.mutate({ id: editRecipe.id, ...data })
    } else {
      createRecipe.mutate(data)
    }
  }

  const addIngredient = () => {
    if (!pantryItems?.length) return
    setIngredients((prev) => [
      ...prev,
      { pantry_item_id: pantryItems[0].id, quantity: 1, unit: pantryItems[0].unit, is_optional: false },
    ])
  }

  const removeIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index))
  }

  const updateIngredientPantryItem = (index: number, pantryItemId: string) => {
    setIngredients((prev) =>
      prev.map((ing, i) => {
        if (i !== index) return ing
        const item = pantryItems?.find((pantryItem) => pantryItem.id === pantryItemId)
        return {
          ...ing,
          pantry_item_id: pantryItemId,
          unit: item?.unit ?? ing.unit,
        }
      })
    )
  }

  const updateIngredientQuantity = (index: number, quantity: number) => {
    setIngredients((prev) =>
      prev.map((ingredient, i) => (i === index ? { ...ingredient, quantity } : ingredient))
    )
  }

  const toggleIngredientOptional = (index: number) => {
    setIngredients((prev) =>
      prev.map((ingredient, i) =>
        i === index ? { ...ingredient, is_optional: !ingredient.is_optional } : ingredient
      )
    )
  }

  const toggleDietTag = (tag: DietTag) => {
    setDietTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const isSubmitting = createRecipe.isPending || updateRecipe.isPending

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Editar receta" : "Nueva receta"}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className={RECIPE_FORM_FIELD_CLASS}>
            <label htmlFor="recipe-name" className={RECIPE_FORM_LABEL_CLASS}>Nombre</label>
            <input
              id="recipe-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Pasta con salsa casera"
              className={RECIPE_FORM_INPUT_CLASS}
              autoFocus
              required
            />
          </div>

          {/* Calories */}
          <div className={RECIPE_FORM_FIELD_CLASS}>
            <label htmlFor="recipe-calories" className="text-sm font-medium">Calorías (kcal)</label>
            <input
              id="recipe-calories"
              type="number"
              min={0}
              value={calories}
              onChange={(e) => setCalories(e.target.value ? Number(e.target.value) : "")}
              placeholder="Opcional"
              className={RECIPE_FORM_INPUT_CLASS}
            />
          </div>

          {/* Image URL */}
          <div className={RECIPE_FORM_FIELD_CLASS}>
            <label htmlFor="recipe-image" className={RECIPE_FORM_LABEL_CLASS}>URL de imagen (opcional)</label>
            <input
              id="recipe-image"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className={RECIPE_FORM_INPUT_CLASS}
            />
          </div>

          {/* Diet tags */}
          <div className={RECIPE_FORM_FIELD_CLASS}>
            <label className={RECIPE_FORM_LABEL_CLASS}>Dieta</label>
            <div className="flex flex-wrap gap-2">
              {DIET_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleDietTag(opt.value)}
                  aria-label={`Alternar dieta ${opt.label}`}
                  className={`min-h-11 rounded-full px-4 py-2 text-xs font-medium transition-colors cursor-pointer ${
                    dietTags.includes(opt.value)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ingredients */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Ingredientes</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addIngredient}
                disabled={!pantryItems?.length}
                className="gap-1 cursor-pointer h-7 text-xs"
              >
                <Plus className="h-3 w-3" />
                Agregar
              </Button>
            </div>

            {ingredients.length > 0 ? (
              <div className="space-y-2">
                {ingredients.map((ing, index) => (
                  <div key={index} className="space-y-2 rounded-lg border border-border/60 p-2.5">
                    <div className="grid grid-cols-[minmax(0,1fr)_72px_44px_32px] items-center gap-2">
                      <select
                        value={ing.pantry_item_id}
                        onChange={(e) => updateIngredientPantryItem(index, e.target.value)}
                        className="h-9 min-w-0 rounded-md border border-input bg-transparent px-2 text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        {pantryItems?.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={ing.quantity}
                        onChange={(e) => updateIngredientQuantity(index, Number(e.target.value))}
                        className="h-9 rounded-md border border-input bg-transparent px-2 text-xs text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                      <span className="truncate text-xs text-muted-foreground">{ing.unit}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Quitar ingrediente ${pantryItems?.find((item) => item.id === ing.pantry_item_id)?.name ?? index + 1}`}
                        onClick={() => removeIngredient(index)}
                        className="h-8 w-8 text-destructive hover:text-destructive cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <button
                      type="button"
                      aria-pressed={ing.is_optional}
                      aria-label={`Marcar ingrediente ${index + 1} como ${ing.is_optional ? "obligatorio" : "opcional"}`}
                      onClick={() => toggleIngredientOptional(index)}
                      className={`h-8 rounded-full px-3 text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                        ing.is_optional
                          ? "bg-muted text-muted-foreground hover:bg-muted/80"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      }`}
                    >
                      {ing.is_optional ? "Opcional" : "Obligatorio"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {pantryItems?.length
                  ? "Agregá ingredientes de tu despensa"
                  : "Primero agregá productos a tu despensa"}
              </p>
            )}
          </div>

          {/* Instructions */}
          <div className={RECIPE_FORM_FIELD_CLASS}>
            <label htmlFor="recipe-instructions" className={RECIPE_FORM_LABEL_CLASS}>
              Instrucciones
            </label>
            <textarea
              id="recipe-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Paso 1: ..."
              rows={4}
              className={RECIPE_FORM_TEXTAREA_CLASS}
            />
          </div>

        <DialogFooter>
          <Button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="cursor-pointer"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEditing ? "Guardar cambios" : "Crear receta"}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}
