"use client"

import { useSearchParams } from "next/navigation"
import { RecipeGrid } from "./RecipeGrid"
import { RecipeSuggester } from "./RecipeSuggester"
import { MealTracker } from "./MealTracker"
import { MealPlanView } from "./MealPlanView"
import { ModuleShell } from "@/components/layout/module-shell"
import { TabTransition } from "@/components/layout/module-transition"

/**
 * Main recipes module content router.
 * Driven by sidebar sub-modules via ?tab query parameter.
 */
export function RecipeTabs() {
  const searchParams = useSearchParams()
  const activeTab = searchParams.get("tab") || "recetas"

  return (
    <ModuleShell>
      <TabTransition value={activeTab} className="pt-8">
        {activeTab === "recetas" && <RecipeGrid />}
        {activeTab === "sugeridor" && <RecipeSuggester />}
        {activeTab === "tracker" && <MealTracker />}
        {activeTab === "plan" && <MealPlanView />}

        {!["recetas", "sugeridor", "tracker", "plan"].includes(activeTab) && (
          <RecipeGrid />
        )}
      </TabTransition>
    </ModuleShell>
  )
}
