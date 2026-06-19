"use client"

import { useSearchParams } from "next/navigation"
import { FinanceDashboard } from "./FinanceDashboard"
import { ExpenseList } from "./ExpenseList"
import { SubscriptionList } from "./SubscriptionList"
import { SavingGoalsList } from "./SavingGoalsList"
import { DebtList } from "./DebtList"
import { ModuleShell } from "@/components/layout/module-shell"
import { TabTransition } from "@/components/layout/module-transition"

/**
 * Main finance module content router.
 * Now driven by sidebar sub-modules via ?tab query parameter.
 * Uses Framer Motion for smooth transitions between sub-views.
 */
export function FinanceTabs() {
  const searchParams = useSearchParams()
  const activeTab = searchParams.get("tab") || "dashboard"

  return (
    <ModuleShell>
      <TabTransition value={activeTab} className="pt-8">
        {activeTab === "dashboard" && <FinanceDashboard />}
        {activeTab === "gastos" && <ExpenseList />}
        {activeTab === "suscripciones" && <SubscriptionList />}
        {activeTab === "metas" && <SavingGoalsList />}
        {activeTab === "deudas" && <DebtList />}

        {!["dashboard", "gastos", "suscripciones", "metas", "deudas"].includes(activeTab) && (
          <FinanceDashboard />
        )}
      </TabTransition>
    </ModuleShell>
  )
}
