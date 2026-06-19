"use client"

import { motion } from "framer-motion"
import { Trash2 } from "lucide-react"
import { CategoryIcon } from "./CategoryIcon"

interface ExpenseItemProps {
  expense: {
    id: string
    description: string | null
    amount: number
    currency: string
    date: string
    source: string | null
    categories?: { id: string; name: string; icon: string | null } | null
  }
  index: number
  usdRate?: number
  onDelete: (id: string) => void
}

/**
 * Individual expense row following Design.md §6.3 list item spec.
 * Displays category icon, description, amount, date, and source badge.
 */
export function ExpenseItem({ expense, index, usdRate, onDelete }: ExpenseItemProps) {
  const isIncome = expense.amount > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40, height: 0 }}
      transition={{ delay: index * 0.03 }}
      className="group flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors"
    >
      {/* Category icon */}
      <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-muted/50 shrink-0">
        <CategoryIcon
          name={expense.categories?.icon ?? "receipt"}
          className="h-5 w-5 text-muted-foreground"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {expense.description || "Sin descripción"}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {expense.categories?.name ?? "Sin categoría"}
          </span>
          <span className="text-xs text-muted-foreground/50">·</span>
          <span className="text-xs text-muted-foreground">
            {new Date(expense.date).toLocaleDateString("es-AR", {
              day: "numeric",
              month: "short",
            })}
          </span>
          {expense.source && expense.source !== "manual" && (
            <>
              <span className="text-xs text-muted-foreground/50">·</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {expense.source === "ai" ? "IA" : expense.source === "ai_vision" ? "Ticket" : expense.source}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <p
          className={`text-sm font-medium tabular-nums ${
            isIncome ? "text-success" : "text-destructive"
          }`}
        >
          {isIncome ? "+" : "-"}${Math.abs(expense.amount).toLocaleString("es-AR")}
        </p>
        {!isIncome && expense.currency === "ARS" && usdRate && (
          <p className="text-[10px] text-muted-foreground/60 tabular-nums">
            u$s {(Math.abs(expense.amount) / usdRate).toFixed(2)}
          </p>
        )}
      </div>

      {/* Delete */}
      <button
        type="button"
        onClick={() => onDelete(expense.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 rounded-lg flex items-center justify-center hover:bg-destructive/10 cursor-pointer"
        aria-label="Eliminar gasto"
        id={`delete-expense-${expense.id}`}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </button>
    </motion.div>
  )
}
