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

interface SavingGoalFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

/**
 * Modal form for creating a new saving goal.
 */
export function SavingGoalForm({
  open,
  onOpenChange,
  onSuccess,
}: SavingGoalFormProps) {
  const [name, setName] = useState("")
  const [targetAmount, setTargetAmount] = useState("")
  const [deadline, setDeadline] = useState("")

  const createGoal = trpc.savingGoals.create.useMutation({
    onSuccess: () => {
      toast.success("Meta creada")
      onSuccess()
      onOpenChange(false)
      resetForm()
    },
    onError: (err) => toast.error(err.message),
  })

  const resetForm = () => {
    setName("")
    setTargetAmount("")
    setDeadline("")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const numTarget = parseFloat(targetAmount)
    if (!name || !numTarget || numTarget <= 0) {
      toast.error("Completá nombre y monto objetivo")
      return
    }

    createGoal.mutate({
      name,
      target_amount: numTarget,
      deadline: deadline || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva meta de ahorro</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid gap-2">
            <Label htmlFor="goal-name">Nombre</Label>
            <Input
              id="goal-name"
              placeholder="Ej: Vacaciones, Notebook nueva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="goal-target">Monto objetivo</Label>
            <Input
              id="goal-target"
              type="number"
              step="0.01"
              placeholder="0"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              required
              className="tabular-nums"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="goal-deadline">Fecha límite (opcional)</Label>
            <Input
              id="goal-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={createGoal.isPending}
              className="w-full cursor-pointer"
            >
              {createGoal.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Crear meta"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
