"use client"

import { useState, useEffect } from "react"
import { trpc } from "@/lib/trpc"
import { motion, AnimatePresence } from "framer-motion"
import {
  Receipt,
  Plus,
  Download,
  Loader2,
} from "lucide-react"
import { ModuleHeader } from "@/components/layout/module-header"
import { Button } from "@/components/ui/button"
import { showUndoToast } from "@/components/ui/undo-toast"
import { toast } from "sonner"
import { ExpenseFilters } from "./ExpenseFilters"
import { ExpenseItem } from "./ExpenseItem"
import { ExpenseFormModal } from "./ExpenseFormModal"
import { ExportCSVModal } from "./ExportCSVModal"
import type { Expense, ExpenseFilters as Filters } from "@/types/finance"

interface ExpenseListQuery extends Omit<Filters, "datePreset"> {
  limit: number
  offset: number
}

interface DollarRateResponse {
  venta?: number
}

/**
 * Full expense list view with filters, CRUD, and CSV export.
 * Supports soft delete with UndoToast.
 */
export function ExpenseList() {
  const [filters, setFilters] = useState<Filters>({})
  const [showForm, setShowForm] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [usdRate, setUsdRate] = useState<number | undefined>()

  useEffect(() => {
    fetch("/api/finanzas/dolar")
      .then(res => res.json())
      .then((data: DollarRateResponse) => setUsdRate(data.venta))
      .catch(() => { })
  }, [])

  const utils = trpc.useUtils()

  const queryInput: ExpenseListQuery = {
    limit: 50,
    offset: 0,
  }
  if (filters.categoryId) queryInput.categoryId = filters.categoryId
  if (filters.dateFrom) queryInput.dateFrom = filters.dateFrom
  if (filters.dateTo) queryInput.dateTo = filters.dateTo
  if (filters.amountMin) queryInput.amountMin = filters.amountMin
  if (filters.amountMax) queryInput.amountMax = filters.amountMax

  const { data: expenses, isLoading } = trpc.expenses.list.useQuery(queryInput)

  const deleteExpense = trpc.expenses.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.expenses.list.cancel(queryInput)
      const previousExpenses = utils.expenses.list.getData(queryInput)
      
      utils.expenses.list.setData(queryInput, (old: Expense[] | undefined) => {
        if (!old) return old
        return old.filter((expense) => expense.id !== id)
      })
      
      return { previousExpenses }
    },
    onSuccess: (deleted) => {
      showUndoToast({
        message: `Gasto eliminado: ${deleted.description || "Sin descripción"}`,
        undoId: undefined,
        onUndo: () => {
          restoreExpense.mutate({ id: deleted.id })
        },
      })
    },
    onError: (err, variables, context) => {
      utils.expenses.list.setData(queryInput, context?.previousExpenses)
      toast.error("Error al eliminar", { description: err.message })
    },
    onSettled: () => {
      utils.expenses.list.invalidate()
      utils.expenses.getMonthSummary.invalidate()
      utils.expenses.getTopCategories.invalidate()
    }
  })

  const restoreExpense = trpc.expenses.restore.useMutation({
    onSuccess: () => {
      toast.success("Gasto restaurado")
    },
    onSettled: () => {
      utils.expenses.list.invalidate()
      utils.expenses.getMonthSummary.invalidate()
      utils.expenses.getTopCategories.invalidate()
    },
  })

  return (
    <div className="space-y-4">
      <ModuleHeader
        module="Finanzas"
        title="Gastos"
        description={`${expenses?.length ?? 0} registros`}
        className="pt-0"
        actions={
          <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExport(true)}
            className="gap-1.5 cursor-pointer"
            id="export-csv-btn"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">CSV</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="gap-1.5 cursor-pointer"
            id="add-expense-btn"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nuevo gasto</span>
          </Button>
          </>
        }
      />

      {/* Filters */}
      <ExpenseFilters filters={filters} onChange={setFilters} />

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : expenses && expenses.length > 0 ? (
        <div className="space-y-1">
          <AnimatePresence>
            {(expenses as Expense[]).map((expense, i) => (
              <ExpenseItem
                key={expense.id}
                expense={expense}
                index={i}
                usdRate={usdRate}
                onDelete={(id) => deleteExpense.mutate({ id })}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <Receipt className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No hay gastos registrados</p>
          <Button
            variant="outline"
            className="mt-4 cursor-pointer"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Registrar primer gasto
          </Button>
        </motion.div>
      )}

      {/* Create expense modal */}
      <ExpenseFormModal
        open={showForm}
        onOpenChange={setShowForm}
        onSuccess={() => {
          utils.expenses.list.invalidate()
          utils.expenses.getMonthSummary.invalidate()
          utils.expenses.getTopCategories.invalidate()
        }}
      />

      {/* Export CSV modal */}
      <ExportCSVModal
        open={showExport}
        onOpenChange={setShowExport}
      />
    </div>
  )
}
