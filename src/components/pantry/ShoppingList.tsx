"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { motion, AnimatePresence } from "framer-motion"
import {
  ShoppingCart,
  Plus,
  Check,
  Trash2,
  Loader2,
  Sparkles,
  XCircle,
} from "lucide-react"
import { ModuleHeader } from "@/components/layout/module-header"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface ShoppingListItem {
  id: string
  pantry_item_id: string | null
  name: string
  quantity: number | string | null
  unit: string | null
  checked: boolean
  auto_generated: boolean
  note: string | null
}

/**
 * Shopping list view.
 * Supports checking items as bought (which updates pantry),
 * clearing all checked items, and manual item addition.
 */
export function ShoppingList() {
  const [newItemName, setNewItemName] = useState("")
  const utils = trpc.useUtils()

  const { data: items, isLoading } = trpc.shoppingList.list.useQuery()
  const itemRows = (items ?? []) as ShoppingListItem[]

  const addItem = trpc.shoppingList.create.useMutation({
    onSuccess: () => {
      toast.success("Item agregado")
      setNewItemName("")
    },
    onSettled: () => utils.shoppingList.list.invalidate(),
    onError: (err) => toast.error("Error", { description: err.message }),
  })

  const markChecked = trpc.shoppingList.markChecked.useMutation({
    onSettled: () => {
      utils.shoppingList.list.invalidate()
      utils.pantryItems.list.invalidate()
    },
    onError: (err) => toast.error("Error", { description: err.message }),
  })

  const deleteItem = trpc.shoppingList.delete.useMutation({
    onSettled: () => utils.shoppingList.list.invalidate(),
    onError: (err) => toast.error("Error", { description: err.message }),
  })

  const clearChecked = trpc.shoppingList.clearChecked.useMutation({
    onSuccess: () => toast.success("Items comprados eliminados"),
    onSettled: () => utils.shoppingList.list.invalidate(),
    onError: (err) => toast.error("Error", { description: err.message }),
  })

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim()) return
    addItem.mutate({ name: newItemName.trim() })
  }

  const uncheckedItems = itemRows.filter((item) => !item.checked)
  const checkedItems = itemRows.filter((item) => item.checked)

  return (
    <div className="space-y-4">
      <ModuleHeader
        module="Despensa"
        title="Compras"
        description={`${uncheckedItems.length} pendiente${uncheckedItems.length !== 1 ? "s" : ""}`}
        className="pt-0"
        actions={checkedItems.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => clearChecked.mutate()}
            disabled={clearChecked.isPending}
            className="gap-1.5 cursor-pointer"
            id="clear-checked-btn"
          >
            <XCircle className="h-4 w-4" />
            Limpiar comprados
          </Button>
        )}
      />

      {/* Quick add */}
      <form onSubmit={handleAddItem} className="flex gap-2">
        <input
          type="text"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          placeholder="Agregar producto..."
          className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          id="shopping-quick-add"
        />
        <Button
          type="submit"
          size="sm"
          disabled={addItem.isPending || !newItemName.trim()}
          className="cursor-pointer"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </form>

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : itemRows.length > 0 ? (
        <div className="space-y-1">
          {/* Unchecked items */}
          <AnimatePresence>
            {uncheckedItems.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50, height: 0 }}
                transition={{ duration: 0.15, delay: i * 0.02 }}
                className="group flex items-center gap-3 rounded-lg border border-border/50 bg-card p-3 transition-colors hover:bg-muted/30"
              >
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={() => markChecked.mutate({ id: item.id })}
                  aria-label={`Marcar ${item.name} como comprado`}
                  className="h-5 w-5 rounded border-2 border-muted-foreground/30 flex items-center justify-center transition-colors hover:border-primary cursor-pointer shrink-0"
                  id={`check-shopping-${item.id}`}
                >
                  {/* Empty circle */}
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{item.name}</span>
                    {item.auto_generated && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        <Sparkles className="h-2.5 w-2.5" />
                        Auto
                      </span>
                    )}
                  </div>
                  {item.quantity && (
                    <span className="text-xs text-muted-foreground">
                      {Number(item.quantity)} {item.unit ?? ""}
                    </span>
                  )}
                  {item.note && (
                    <p className="text-xs text-muted-foreground/70 mt-0.5">{item.note}</p>
                  )}
                </div>

                {/* Delete */}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Eliminar ${item.name} de la lista`}
                  onClick={() => deleteItem.mutate({ id: item.id })}
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  id={`delete-shopping-${item.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Checked items */}
          {checkedItems.length > 0 && (
            <>
              <div className="pt-3 pb-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Comprados ({checkedItems.length})
                </span>
              </div>
              <AnimatePresence>
                {checkedItems.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-3 rounded-lg p-3"
                  >
                    <div className="h-5 w-5 rounded bg-primary/20 flex items-center justify-center shrink-0">
                      <Check className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-sm line-through text-muted-foreground">{item.name}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </>
          )}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <ShoppingCart className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No hay items en la lista de compras</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Los items se agregan automáticamente cuando el stock baja del mínimo
          </p>
        </motion.div>
      )}
    </div>
  )
}
