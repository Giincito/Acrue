import { Suspense } from "react"

import { PantryTabs } from "@/components/pantry/PantryTabs"

function ModuleFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
      Cargando despensa...
    </div>
  )
}

export default function DespensaPage() {
  return (
    <Suspense fallback={<ModuleFallback />}>
      <PantryTabs />
    </Suspense>
  )
}
