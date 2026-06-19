"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"

interface PantryItemFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editItem?: EditablePantryItem
  onSuccess: () => void
}

const UNIT_OPTIONS = [
  { value: "g", label: "Gramos (g)" },
  { value: "kg", label: "Kilogramos (kg)" },
  { value: "ml", label: "Mililitros (ml)" },
  { value: "l", label: "Litros (L)" },
  { value: "unidades", label: "Unidades" },
] as const

type PantryUnit = (typeof UNIT_OPTIONS)[number]["value"]

interface EditablePantryItem {
  id: string
  name: string | null
  quantity: number | string | null
  unit: PantryUnit | null
  min_stock: number | string | null
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function getInitialFormState(editItem?: EditablePantryItem) {
  return {
    name: editItem?.name ?? "",
    quantity: toNumber(editItem?.quantity),
    unit: editItem?.unit ?? "unidades",
    minStock: toNumber(editItem?.min_stock),
  }
}

/**
 * Dialog form for creating or editing a pantry item.
 * Single-column layout per design system.
 */
export function PantryItemForm({ open, onOpenChange, editItem, onSuccess }: PantryItemFormProps) {
  const formKey = `${open ? "open" : "closed"}-${editItem?.id ?? "new"}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <PantryItemFormFields key={formKey} editItem={editItem} onSuccess={onSuccess} />
      </DialogContent>
    </Dialog>
  )
}

function PantryItemFormFields({
  editItem,
  onSuccess,
}: {
  editItem?: EditablePantryItem
  onSuccess: () => void
}) {
  const initialState = getInitialFormState(editItem)
  const [name, setName] = useState(initialState.name)
  const [quantity, setQuantity] = useState(initialState.quantity)
  const [unit, setUnit] = useState<PantryUnit>(initialState.unit)
  const [minStock, setMinStock] = useState(initialState.minStock)

  const isEditing = Boolean(editItem)

  const createItem = trpc.pantryItems.create.useMutation({
    onSuccess: () => {
      toast.success("Producto agregado")
      onSuccess()
    },
    onError: (err) => toast.error("Error al crear", { description: err.message }),
  })

  const updateItem = trpc.pantryItems.update.useMutation({
    onSuccess: () => {
      toast.success("Producto actualizado")
      onSuccess()
    },
    onError: (err) => toast.error("Error al actualizar", { description: err.message }),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    if (isEditing && editItem) {
      updateItem.mutate({
        id: editItem.id,
        name: name.trim(),
        quantity,
        unit,
        min_stock: minStock,
      })
    } else {
      createItem.mutate({
        name: name.trim(),
        quantity,
        unit,
        min_stock: minStock,
      })
    }
  }

  const isSubmitting = createItem.isPending || updateItem.isPending

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Editar producto" : "Nuevo producto"}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label htmlFor="pantry-name" className="text-sm font-medium">
              Nombre
            </label>
            <input
              id="pantry-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Arroz, Leche, Huevos..."
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              autoFocus
              required
            />
          </div>

          {/* Quantity + Unit in one row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="pantry-qty" className="text-sm font-medium">
                Cantidad
              </label>
              <input
                id="pantry-qty"
                type="number"
                min={0}
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="pantry-unit" className="text-sm font-medium">
                Unidad
              </label>
              <select
                id="pantry-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value as PantryUnit)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
              >
                {UNIT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Min Stock */}
          <div className="space-y-1.5">
            <label htmlFor="pantry-min" className="text-sm font-medium">
              Stock mínimo
            </label>
            <input
              id="pantry-min"
              type="number"
              min={0}
              step="any"
              value={minStock}
              onChange={(e) => setMinStock(Number(e.target.value))}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              Se agrega automáticamente a la lista de compras al bajar de este nivel
            </p>
          </div>

        <DialogFooter>
          <Button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="cursor-pointer"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEditing ? "Guardar cambios" : "Agregar"}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}
