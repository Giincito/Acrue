"use client"

import { useState, useCallback } from "react"
import { trpc } from "@/lib/trpc"
import { motion, AnimatePresence } from "framer-motion"
import {
  Package,
  Plus,
  Minus,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
} from "lucide-react"
import { ModuleHeader } from "@/components/layout/module-header"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { PantryItemForm } from "./PantryItemForm"

type PantryUnit = "g" | "kg" | "ml" | "l" | "unidades"

interface PantryInventoryItem {
  id: string
  name: string | null
  quantity: number | string | null
  unit: PantryUnit | null
  min_stock: number | string | null
  isLowStock: boolean
}

/**
 * Pantry inventory view with inline +/- quantity controls.
 * Low-stock items are visually flagged with an amber badge.
 * Quantity updates are debounced at 400ms before PATCH.
 */
export function PantryInventory() {
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<PantryInventoryItem | null>(null)
  const [pendingDeltas, setPendingDeltas] = useState<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const utils = trpc.useUtils()
  const { data: items, isLoading } = trpc.pantryItems.list.useQuery()

  const updateQuantity = trpc.pantryItems.updateQuantity.useMutation({
    onSettled: () => {
      utils.pantryItems.list.invalidate()
    },
    onError: (err) => {
      toast.error("Error al actualizar cantidad", { description: err.message })
    },
  })

  const deleteItem = trpc.pantryItems.delete.useMutation({
    onSuccess: () => {
      toast.success("Item eliminado")
    },
    onSettled: () => {
      utils.pantryItems.list.invalidate()
    },
    onError: (err) => {
      toast.error("Error al eliminar", { description: err.message })
    },
  })

  /** Debounced quantity change — waits 400ms before sending PATCH */
  const handleQuantityChange = useCallback(
    (itemId: string, delta: number) => {
      // Optimistic update
      utils.pantryItems.list.setData(undefined, (old: PantryInventoryItem[] | undefined) => {
        if (!old) return old
        return old.map((item) =>
          item.id === itemId
            ? {
                ...item,
                quantity: Math.max(0, Number(item.quantity) + delta),
                isLowStock: Math.max(0, Number(item.quantity) + delta) < Number(item.min_stock),
              }
            : item
        )
      })

      // Clear existing timeout for this item
      const existingTimeout = pendingDeltas.get(itemId)
      if (existingTimeout) clearTimeout(existingTimeout)

      // Set new debounced timeout
      const timeout = setTimeout(() => {
        updateQuantity.mutate({ id: itemId, delta })
        setPendingDeltas((prev) => {
          const next = new Map(prev)
          next.delete(itemId)
          return next
        })
      }, 400)

      setPendingDeltas((prev) => new Map(prev).set(itemId, timeout))
    },
    [utils, updateQuantity, pendingDeltas]
  )

  const handleDelete = (itemId: string) => {
    deleteItem.mutate({ id: itemId })
  }

  const handleEdit = (item: PantryInventoryItem) => {
    setEditingItem(item)
    setShowForm(true)
  }

  const unitLabel = (unit: string | null | undefined) => {
    const map: Record<string, string> = {
      g: "g",
      kg: "kg",
      ml: "ml",
      l: "L",
      unidades: "u",
    }
    return unit ? map[unit] ?? unit : ""
  }

  return (
    <div className="space-y-4">
      <ModuleHeader
        module="Despensa"
        title="Inventario"
        description={`${items?.length ?? 0} productos`}
        className="pt-0"
        actions={
        <Button
          size="sm"
          onClick={() => {
            setEditingItem(null)
            setShowForm(true)
          }}
          className="gap-1.5 cursor-pointer"
          id="add-pantry-item-btn"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Agregar</span>
        </Button>
        }
      />

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items && items.length > 0 ? (
        <div className="space-y-1">
          <AnimatePresence>
            {(items as PantryInventoryItem[]).map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15, delay: i * 0.02 }}
                className="group flex items-center gap-3 rounded-lg border border-border/50 bg-card p-3 transition-colors hover:bg-muted/30"
              >
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{item.name}</span>
                    {item.isLowStock && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
                        <AlertTriangle className="h-3 w-3" />
                        Bajo
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Mínimo: {Number(item.min_stock)} {unitLabel(item.unit)}
                  </span>
                </div>

                {/* Quantity controls */}
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label={`Reducir cantidad de ${item.name}`}
                    onClick={() => handleQuantityChange(item.id, -1)}
                    className="h-7 w-7 cursor-pointer"
                    disabled={Number(item.quantity) <= 0}
                    id={`decrease-qty-${item.id}`}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>

                  <span className="w-16 text-center text-sm font-mono tabular-nums">
                    {Number(item.quantity)} {unitLabel(item.unit)}
                  </span>

                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label={`Aumentar cantidad de ${item.name}`}
                    onClick={() => handleQuantityChange(item.id, 1)}
                    className="h-7 w-7 cursor-pointer"
                    id={`increase-qty-${item.id}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Editar ${item.name}`}
                    onClick={() => handleEdit(item)}
                    className="h-7 w-7 cursor-pointer"
                    id={`edit-pantry-${item.id}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Eliminar ${item.name}`}
                    onClick={() => handleDelete(item.id)}
                    className="h-7 w-7 text-destructive hover:text-destructive cursor-pointer"
                    id={`delete-pantry-${item.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.div>
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
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Tu despensa está vacía</p>
          <Button
            variant="outline"
            className="mt-4 cursor-pointer"
            onClick={() => {
              setEditingItem(null)
              setShowForm(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar primer producto
          </Button>
        </motion.div>
      )}

      {/* Create/Edit form modal */}
      <PantryItemForm
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open)
          if (!open) setEditingItem(null)
        }}
        editItem={editingItem ?? undefined}
        onSuccess={() => {
          utils.pantryItems.list.invalidate()
          setShowForm(false)
          setEditingItem(null)
        }}
      />
    </div>
  )
}
