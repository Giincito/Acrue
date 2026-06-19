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

interface DebtPaymentModalProps {
  debtId: string | null
  maxAmount: number
  onClose: () => void
  onSuccess: () => void
}

export function DebtPaymentModal({
  debtId,
  maxAmount,
  onClose,
  onSuccess,
}: DebtPaymentModalProps) {
  const [amount, setAmount] = useState("")

  const addPayment = trpc.debts.addPayment.useMutation({
    onSuccess: () => {
      toast.success(`Pago parcial registrado (${parseFloat(amount).toLocaleString("es-AR")})`)
      onSuccess()
      onClose()
      setAmount("")
    },
    onError: (err) => toast.error(err.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = parseFloat(amount)
    if (!debtId || !numAmount || numAmount <= 0) {
      toast.error("Ingresá un monto válido")
      return
    }
    if (numAmount > maxAmount) {
      toast.error("El pago no puede superar el monto restante")
      return
    }
    
    addPayment.mutate({ id: debtId, amount: numAmount })
  }

  return (
    <Dialog open={!!debtId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar pago parcial</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid gap-2">
            <Label htmlFor="add-payment-amount">Monto del pago</Label>
            <Input
              id="add-payment-amount"
              type="number"
              step="0.01"
              max={maxAmount}
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
              className="tabular-nums"
            />
            <p className="text-xs text-muted-foreground">
              Máximo restante: ${maxAmount.toLocaleString("es-AR")}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={addPayment.isPending}
              className="w-full cursor-pointer"
            >
              {addPayment.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Registrar pago"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
