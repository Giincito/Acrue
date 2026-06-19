"use client"

import { useSearchParams } from "next/navigation"
import { PantryInventory } from "./PantryInventory"
import { ShoppingList } from "./ShoppingList"
import { PriceComparator } from "./PriceComparator"
import { ModuleShell } from "@/components/layout/module-shell"
import { TabTransition } from "@/components/layout/module-transition"

/**
 * Main pantry module content router.
 * Driven by sidebar sub-modules via ?tab query parameter.
 * Uses Framer Motion for smooth transitions between sub-views.
 */
export function PantryTabs() {
  const searchParams = useSearchParams()
  const activeTab = searchParams.get("tab") || "inventario"

  return (
    <ModuleShell>
      <TabTransition value={activeTab} className="pt-8">
        {activeTab === "inventario" && <PantryInventory />}
        {activeTab === "compras" && <ShoppingList />}
        {activeTab === "comparador" && <PriceComparator />}

        {!["inventario", "compras", "comparador"].includes(activeTab) && (
          <PantryInventory />
        )}
      </TabTransition>
    </ModuleShell>
  )
}
