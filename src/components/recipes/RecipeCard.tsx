"use client"

/* eslint-disable @next/next/no-img-element -- Recipe images are user-provided URLs, so next/image host allowlists would reject valid saved data. */

import { motion } from "framer-motion"
import { ChefHat, Flame, Star } from "lucide-react"

export interface RecipeCardData {
  id: string
  name: string
  calories: number | null
  diet_tags: string[] | null
  image_url: string | null
  is_favorite: boolean
}

interface RecipeCardProps {
  recipe: RecipeCardData
  index: number
  onClick: () => void
}

const dietLabels: Record<string, string> = {
  vegetariano: "Vegetariano",
  vegano: "Vegano",
  sin_gluten: "Sin Gluten",
  omnivoro: "Omnivoro",
}

export function RecipeCard({ recipe, index, onClick }: RecipeCardProps) {
  const dietTags = recipe.diet_tags ?? []

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15, delay: index * 0.03 }}
      onClick={onClick}
      className="group relative flex flex-col rounded-xl border border-border/50 bg-card overflow-hidden text-left transition-[border-color,box-shadow,transform] duration-200 ease-out hover:shadow-md hover:border-border motion-reduce:transition-none cursor-pointer"
    >
      <div className="relative h-32 bg-muted/30 overflow-hidden">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.name}
            className="w-full h-full object-cover filter grayscale transition-[filter,transform] duration-300 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ChefHat className="h-10 w-10 text-muted-foreground opacity-30" />
          </div>
        )}

        {recipe.is_favorite && (
          <div className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
          </div>
        )}
      </div>

      <div className="p-3 flex-1 flex flex-col gap-1.5">
        <h3 className="text-sm font-medium leading-tight line-clamp-2">{recipe.name}</h3>

        <div className="flex items-center gap-2 mt-auto">
          {recipe.calories !== null && recipe.calories !== undefined && (
            <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
              <Flame className="h-3 w-3" />
              {recipe.calories} kcal
            </span>
          )}

          {dietTags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {dietTags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  {dietLabels[tag] ?? tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.button>
  )
}
