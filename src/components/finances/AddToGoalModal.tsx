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

interface AddToGoalModalProps {
  goalId: string | null
  onClose: () => void
  onSuccess: () => void
}

/**
 * Modal to add money to a saving goal.
 * Shows XP celebration when goal reaches 100%.
 */
export function AddToGoalModal({
  goalId,
  onClose,
  onSuccess,
}: AddToGoalModalProps) {
  const [amount, setAmount] = useState("")

  const addAmount = trpc.savingGoals.addAmount.useMutation({
    onSuccess: (data) => {
      const wasCompleted = data.current_amount >= data.target_amount
      if (wasCompleted) {
        toast.success("Meta alcanzada. +50 XP")
      } else {
        toast.success(`$${parseFloat(amount).toLocaleString("es-AR")} agregados`)
      }
      onSuccess()
      onClose()
      setAmount("")
    },
    onError: (err) => toast.error(err.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = parseFloat(amount)
    if (!goalId || !numAmount || numAmount <= 0) {
      toast.error("Ingresá un monto válido")
      return
    }
    addAmount.mutate({ id: goalId, amount: numAmount })
  }

  return (
    <Dialog open={!!goalId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Agregar a meta</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid gap-2">
            <Label htmlFor="add-goal-amount">Monto a agregar</Label>
            <Input
              id="add-goal-amount"
              type="number"
              step="0.01"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
              className="tabular-nums"
            />
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={addAmount.isPending}
              className="w-full cursor-pointer"
            >
              {addAmount.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Agregar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
