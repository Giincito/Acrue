import { Suspense } from "react"

import { RecipeTabs } from "@/components/recipes/RecipeTabs"

function ModuleFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
      Cargando recetas...
    </div>
  )
}

export default function RecetasPage() {
  return (
    <Suspense fallback={<ModuleFallback />}>
      <RecipeTabs />
    </Suspense>
  )
}
