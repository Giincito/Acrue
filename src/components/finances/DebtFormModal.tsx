"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

interface DebtFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function DebtFormModal({
  open,
  onOpenChange,
  onSuccess,
}: DebtFormModalProps) {
  const [name, setName] = useState("")
  const [person, setPerson] = useState("")
  const [type, setType] = useState<"owed_to_me" | "i_owe">("owed_to_me")
  const [totalAmount, setTotalAmount] = useState("")
  const [currency, setCurrency] = useState("ARS")
  const [dueDate, setDueDate] = useState("")
  const [notes, setNotes] = useState("")

  const createDebt = trpc.debts.create.useMutation({
    onSuccess: () => {
      toast.success("Deuda registrada")
      onSuccess()
      onOpenChange(false)
      resetForm()
    },
    onError: (err) => toast.error(err.message),
  })

  const resetForm = () => {
    setName("")
    setPerson("")
    setType("owed_to_me")
    setTotalAmount("")
    setCurrency("ARS")
    setDueDate("")
    setNotes("")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = parseFloat(totalAmount)
    if (!name || !person || !numAmount || numAmount <= 0) {
      toast.error("Completá todos los campos obligatorios")
      return
    }

    createDebt.mutate({
      name,
      person,
      type,
      total_amount: numAmount,
      currency,
      due_date: dueDate || null,
      notes: notes || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar nueva deuda</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Type toggle */}
          <div className="flex items-center gap-2 p-1 rounded-lg bg-muted">
            <button
              type="button"
              onClick={() => setType("owed_to_me")}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                type === "owed_to_me" ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              Me deben plata
            </button>
            <button
              type="button"
              onClick={() => setType("i_owe")}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                type === "i_owe" ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              Le debo a alguien
            </button>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="debt-name">Nombre de la deuda</Label>
            <Input
              id="debt-name"
              placeholder="Ej: Préstamo para el viaje"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="debt-person">{type === "owed_to_me" ? "Quién te debe" : "A quién le debes"}</Label>
            <Input
              id="debt-person"
              placeholder="Ej: Juan, Mamá"
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="debt-amount">Monto total</Label>
              <Input
                id="debt-amount"
                type="number"
                step="0.01"
                placeholder="0"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                required
                className="tabular-nums"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="debt-currency">Moneda</Label>
              <select
                id="debt-currency"
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
            <Label htmlFor="debt-due_date">Fecha límite (opcional)</Label>
            <Input
              id="debt-due_date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="debt-notes">Notas (opcional)</Label>
            <Input
              id="debt-notes"
              placeholder="Ej: Acordamos pagar a principio de mes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={createDebt.isPending}
              className="w-full cursor-pointer"
            >
              {createDebt.isPending ? (
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
