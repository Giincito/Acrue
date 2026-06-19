"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { toast } from "sonner"
import {
  createIndexedDbOfflineActionStore,
  enqueueOfflineAction,
  OFFLINE_ACTION_QUEUED_EVENT,
} from "@/lib/pwa/offline-actions"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

interface ExpenseFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface CategoryOption {
  id: string
  name: string
}

/**
 * Modal form for manually creating an expense.
 * Includes category selection from user's categories.
 */
export function ExpenseFormModal({
  open,
  onOpenChange,
  onSuccess,
}: ExpenseFormModalProps) {
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [categoryId, setCategoryId] = useState("")
  const [currency, setCurrency] = useState("ARS")
  const [isIncome, setIsIncome] = useState(false)

  const { data: categories } = trpc.categories.list.useQuery()

  const createExpense = trpc.expenses.create.useMutation({
    onSuccess: () => {
      toast.success(isIncome ? "Ingreso registrado" : "Gasto registrado")
      onSuccess()
      onOpenChange(false)
      resetForm()
    },
    onError: (err) => {
      toast.error("Error al guardar", { description: err.message })
    },
  })

  const resetForm = () => {
    setDescription("")
    setAmount("")
    setDate(new Date().toISOString().split("T")[0])
    setCategoryId("")
    setCurrency("ARS")
    setIsIncome(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount <= 0) {
      toast.error("El monto debe ser mayor a 0")
      return
    }

    const payload = {
      description,
      amount: isIncome ? numAmount : -numAmount,
      date,
      category_id: categoryId || null,
      currency,
      source: "manual",
    }

    if (!navigator.onLine) {
      await enqueueOfflineAction(
        createIndexedDbOfflineActionStore(),
        "expenses.create",
        payload
      )
      window.dispatchEvent(new Event(OFFLINE_ACTION_QUEUED_EVENT))
      toast.info(isIncome ? "Ingreso guardado offline" : "Gasto guardado offline", {
        description: "Se sincroniza cuando vuelva la conexión.",
      })
      onSuccess()
      onOpenChange(false)
      resetForm()
      return
    }

    createExpense.mutate(payload)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isIncome ? "Registrar ingreso" : "Registrar gasto"}</DialogTitle>
          <DialogDescription>
            Completá los datos del {isIncome ? "ingreso" : "gasto"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Type toggle */}
          <div className="flex items-center gap-2 p-1 rounded-lg bg-muted">
            <button
              type="button"
              onClick={() => setIsIncome(false)}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                !isIncome ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              Gasto
            </button>
            <button
              type="button"
              onClick={() => setIsIncome(true)}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                isIncome ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              Ingreso
            </button>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="expense-description">Descripción</Label>
            <Input
              id="expense-description"
              placeholder="Ej: Supermercado Coto"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="expense-amount">Monto</Label>
              <Input
                id="expense-amount"
                type="number"
                step="0.01"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="tabular-nums"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expense-currency">Moneda</Label>
              <select
                id="expense-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm cursor-pointer"
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="expense-date">Fecha</Label>
            <Input
              id="expense-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {!isIncome && (
            <div className="grid gap-2">
              <Label htmlFor="expense-category">Categoría</Label>
              <select
                id="expense-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm cursor-pointer"
              >
                <option value="">Sin categoría</option>
                {(categories as CategoryOption[] | undefined)?.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <DialogFooter>
            <Button
              type="submit"
              disabled={createExpense.isPending}
              className="w-full cursor-pointer"
            >
              {createExpense.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Guardar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
