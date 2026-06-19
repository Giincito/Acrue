import { Suspense } from "react"

import { FinanceTabs } from "@/components/finances/FinanceTabs"

function ModuleFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
      Cargando finanzas...
    </div>
  )
}

export default function FinanzasPage() {
  return (
    <Suspense fallback={<ModuleFallback />}>
      <FinanceTabs />
    </Suspense>
  )
}
