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

interface SubscriptionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingId: string | null
  subscriptions: SubscriptionOption[]
  onSuccess: () => void
}

interface SubscriptionOption {
  id: string
  name: string
  amount: number
  currency: string
  renewal_date: string
  active: boolean
}

/**
 * Modal form for creating/editing subscriptions.
 */
export function SubscriptionForm({
  open,
  onOpenChange,
  editingId,
  subscriptions,
  onSuccess,
}: SubscriptionFormProps) {
  const editing = editingId ? subscriptions.find(s => s.id === editingId) ?? null : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar suscripción" : "Nueva suscripción"}
          </DialogTitle>
        </DialogHeader>

        <SubscriptionFormFields
          key={`${editing?.id ?? 'new'}-${open ? 'open' : 'closed'}`}
          editing={editing}
          onOpenChange={onOpenChange}
          onSuccess={onSuccess}
        />
      </DialogContent>
    </Dialog>
  )
}

function SubscriptionFormFields({
  editing,
  onOpenChange,
  onSuccess,
}: {
  editing: SubscriptionOption | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [name, setName] = useState(() => editing?.name ?? "")
  const [amount, setAmount] = useState(() => editing ? String(editing.amount) : "")
  const [currency, setCurrency] = useState(() => editing?.currency ?? "ARS")
  const [renewalDate, setRenewalDate] = useState(() => editing?.renewal_date ?? "")
  const [active, setActive] = useState(() => editing?.active ?? true)

  const createSub = trpc.subscriptions.create.useMutation({
    onSuccess: () => {
      toast.success("Suscripción creada")
      onSuccess()
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const updateSub = trpc.subscriptions.update.useMutation({
    onSuccess: () => {
      toast.success("Suscripción actualizada")
      onSuccess()
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = parseFloat(amount)
    if (!name || !numAmount || !renewalDate) {
      toast.error("Completá todos los campos")
      return
    }

    if (editing) {
      updateSub.mutate({
        id: editing.id,
        name,
        amount: numAmount,
        currency,
        renewal_date: renewalDate,
        active,
      })
    } else {
      createSub.mutate({
        name,
        amount: numAmount,
        currency,
        renewal_date: renewalDate,
        active,
      })
    }
  }

  const pending = createSub.isPending || updateSub.isPending

  return (
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid gap-2">
            <Label htmlFor="sub-name">Nombre</Label>
            <Input
              id="sub-name"
              placeholder="Ej: Netflix, Spotify"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="sub-amount">Monto</Label>
              <Input
                id="sub-amount"
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
              <Label htmlFor="sub-currency">Moneda</Label>
              <select
                id="sub-currency"
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
            <Label htmlFor="sub-renewal">Fecha de renovación</Label>
            <Input
              id="sub-renewal"
              type="date"
              value={renewalDate}
              onChange={(e) => setRenewalDate(e.target.value)}
              required
            />
          </div>

          {editing && (
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium cursor-pointer" htmlFor="sub-active">
                Activa
              </label>
              <button
                type="button"
                id="sub-active"
                onClick={() => setActive(!active)}
                role="switch"
                aria-checked={active}
                aria-label="Marcar suscripcion activa"
                className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-muted/80"
              >
                <span className={`flex h-5 w-9 items-center rounded-full transition-colors ${active ? "bg-primary" : "bg-muted"}`}>
                  <span
                    className={`mx-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                      active ? "translate-x-[16px]" : "translate-x-0"
                    }`}
                  />
                </span>
              </button>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending} className="w-full cursor-pointer">
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editing ? (
                "Guardar cambios"
              ) : (
                "Crear suscripción"
              )}
            </Button>
          </DialogFooter>
        </form>
  )
}
