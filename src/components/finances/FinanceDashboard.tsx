"use client"

import { trpc } from "@/lib/trpc"
import { motion } from "framer-motion"
import {
  TrendingDown,
  DollarSign,
  ArrowDownRight,
  ArrowUpRight,
  Activity,
  Loader2,
} from "lucide-react"
import { DollarWidget } from "./DollarWidget"
import { PredictionWidget } from "./PredictionWidget"
import { DebtWidget } from "./DebtWidget"
import { CategoryIcon } from "./CategoryIcon"
import { ModuleHeader } from "@/components/layout/module-header"
import type { Expense } from "@/types/finance"

/**
 * Finance dashboard overview with metric cards, top categories,
 * recent expenses, ARS/USD widget, and month-end prediction.
 */
export function FinanceDashboard() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const { data: summary, isLoading: summaryLoading } =
    trpc.expenses.getMonthSummary.useQuery({ year, month })

  const { data: topCategories, isLoading: catLoading } =
    trpc.expenses.getTopCategories.useQuery({ year, month, limit: 5 })

  const { data: recentExpenses, isLoading: expLoading } =
    trpc.expenses.list.useQuery({ limit: 5 })

  const monthName = now.toLocaleDateString("es-AR", { month: "long" })

  return (
    <div className="space-y-6">
      <ModuleHeader
        module="Finanzas"
        title="Panel"
        description={<span className="capitalize">Resumen de {monthName} {year}</span>}
        className="pt-0"
      />

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard
          label="Balance del mes"
          value={summary?.balance}
          icon={DollarSign}
          loading={summaryLoading}
          trend={summary?.balance !== undefined ? (summary.balance >= 0 ? "up" : "down") : undefined}
        />
        <MetricCard
          label="Gastos"
          value={summary?.totalExpenses ? -summary.totalExpenses : undefined}
          icon={ArrowDownRight}
          loading={summaryLoading}
          variant="expense"
        />
        <MetricCard
          label="Ingresos"
          value={summary?.totalIncome}
          icon={ArrowUpRight}
          loading={summaryLoading}
          variant="income"
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Top categories + Recent expenses */}
        <div className="space-y-6">
          {/* Top categories */}
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <h2 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Top categorías
            </h2>
            {catLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : topCategories && topCategories.length > 0 ? (
              <div className="space-y-3">
                {topCategories.map((cat, i) => (
                  <motion.div
                    key={cat.categoryId ?? "uncategorized"}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted/50">
                      <CategoryIcon name={cat.categoryIcon ?? "tag"} className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">
                          {cat.categoryName}
                        </span>
                        <span className="text-sm tabular-nums text-muted-foreground">
                          ${Math.abs(cat.total).toLocaleString("es-AR")}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${cat.percentage}%` }}
                          transition={{ duration: 0.6, delay: i * 0.1 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay gastos este mes
              </p>
            )}
          </div>

          {/* Recent expenses */}
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <h2 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Últimos gastos
            </h2>
            {expLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : recentExpenses && recentExpenses.length > 0 ? (
              <div className="space-y-2">
                {(recentExpenses as Expense[]).slice(0, 5).map((expense, i) => (
                  <motion.div
                    key={expense.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 py-2"
                  >
                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted/50">
                      <CategoryIcon
                        name={expense.categories?.icon ?? "receipt"}
                        className="h-4 w-4 text-muted-foreground"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {expense.description || "Sin descripción"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {expense.categories?.name ?? "Sin categoría"} ·{" "}
                        {new Date(expense.date).toLocaleDateString("es-AR", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <span className="text-sm font-medium tabular-nums text-destructive">
                      -${Math.abs(expense.amount).toLocaleString("es-AR")}
                    </span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Registrá tu primer gasto
              </p>
            )}
          </div>
        </div>

        {/* Right: Dollar widget + Prediction */}
        <div className="space-y-6">
          <DebtWidget />
          <DollarWidget />
          <PredictionWidget />
        </div>
      </div>
    </div>
  )
}

/** Metric card for the top row */
function MetricCard({
  label,
  value,
  icon: Icon,
  loading,
  trend,
  variant,
}: {
  label: string
  value?: number
  icon: React.ComponentType<{ className?: string }>
  loading: boolean
  trend?: "up" | "down"
  variant?: "income" | "expense"
}) {
  const displayValue = value !== undefined ? Math.abs(value) : 0
  const prefix = variant === "expense" ? "-" : variant === "income" ? "+" : ""
  const colorClass =
    variant === "expense"
      ? "text-destructive"
      : variant === "income"
        ? "text-success"
        : trend === "down"
          ? "text-destructive"
          : "text-success"

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/50 bg-card p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <div className="h-7 w-7 rounded-lg bg-muted/50 flex items-center justify-center">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>
      {loading ? (
        <div className="h-8 flex items-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <p className={`text-2xl font-medium tabular-nums ${value !== undefined ? colorClass : "text-foreground"}`}>
          {prefix}${displayValue.toLocaleString("es-AR")}
        </p>
      )}
    </motion.div>
  )
}
