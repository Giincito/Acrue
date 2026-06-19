"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { DollarSign, Loader2, Plus, Store, Trash2, Trophy } from "lucide-react"
import { toast } from "sonner"
import { trpc } from "@/lib/trpc"
import { ModuleHeader } from "@/components/layout/module-header"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface StoreRow {
  id: string
  name: string
}

interface StorePriceRow {
  store_id: string
  pantry_item_id: string
  price: number | string
}

interface ShoppingPriceItem {
  id: string
  name: string
  pantry_item_id: string | null
}

interface ShoppingPriceItemWithPantry extends ShoppingPriceItem {
  pantry_item_id: string
}

interface CheapestStore {
  id: string
  name: string
  total: number
  itemsCovered: number
}

interface CheapestStoreResult {
  stores: CheapestStore[]
  cheapest: CheapestStore | null
}

export function PriceComparator() {
  const [showStoreDialog, setShowStoreDialog] = useState(false)
  const [newStoreName, setNewStoreName] = useState("")
  const [editingPrice, setEditingPrice] = useState<{
    storeId: string
    pantryItemId: string
    current: number
  } | null>(null)
  const [priceValue, setPriceValue] = useState("")

  const utils = trpc.useUtils()

  const { data: stores, isLoading: storesLoading } = trpc.stores.listStores.useQuery()
  const { data: shoppingItems } = trpc.shoppingList.list.useQuery({ checked: false })
  const { data: prices, isLoading: pricesLoading } = trpc.stores.listPrices.useQuery()
  const { data: cheapest } = trpc.stores.getCheapestStore.useQuery()

  const storeRows = (stores ?? []) as StoreRow[]
  const shoppingRows = (shoppingItems ?? []) as ShoppingPriceItem[]
  const priceRows = (prices ?? []) as StorePriceRow[]
  const cheapestResult = cheapest as CheapestStoreResult | undefined

  const createStore = trpc.stores.createStore.useMutation({
    onSuccess: () => {
      toast.success("Tienda agregada")
      setNewStoreName("")
      setShowStoreDialog(false)
    },
    onSettled: () => utils.stores.listStores.invalidate(),
    onError: (error) => toast.error("Error", { description: error.message }),
  })

  const deleteStore = trpc.stores.deleteStore.useMutation({
    onSuccess: () => toast.success("Tienda eliminada"),
    onSettled: () => {
      utils.stores.listStores.invalidate()
      utils.stores.listPrices.invalidate()
      utils.stores.getCheapestStore.invalidate()
    },
    onError: (error) => toast.error("Error", { description: error.message }),
  })

  const upsertPrice = trpc.stores.upsertPrice.useMutation({
    onSuccess: () => {
      setEditingPrice(null)
      setPriceValue("")
    },
    onSettled: () => {
      utils.stores.listPrices.invalidate()
      utils.stores.getCheapestStore.invalidate()
    },
    onError: (error) => toast.error("Error", { description: error.message }),
  })

  const getPrice = (pantryItemId: string, storeId: string): number | null => {
    const price = priceRows.find(
      (itemPrice) => itemPrice.pantry_item_id === pantryItemId && itemPrice.store_id === storeId
    )
    return price ? Number(price.price) : null
  }

  const getCheapestStoreForItem = (pantryItemId: string): string | null => {
    const itemPrices = priceRows.filter((itemPrice) => itemPrice.pantry_item_id === pantryItemId)
    if (itemPrices.length === 0) return null

    const cheapestPrice = itemPrices.reduce((min, itemPrice) =>
      Number(itemPrice.price) < Number(min.price) ? itemPrice : min
    )
    return cheapestPrice.store_id
  }

  const handlePriceClick = (storeId: string, pantryItemId: string, current: number | null) => {
    setEditingPrice({ storeId, pantryItemId, current: current ?? 0 })
    setPriceValue(current?.toString() ?? "")
  }

  const handlePriceSave = () => {
    if (!editingPrice || !priceValue) return
    upsertPrice.mutate({
      store_id: editingPrice.storeId,
      pantry_item_id: editingPrice.pantryItemId,
      price: Number(priceValue),
    })
  }

  const itemsWithPantryId = shoppingRows.filter(
    (item): item is ShoppingPriceItemWithPantry => Boolean(item.pantry_item_id)
  )

  const isLoading = storesLoading || pricesLoading

  return (
    <div className="space-y-4">
      <ModuleHeader
        module="Despensa"
        title="Comparador"
        description="Compara precios entre tiendas."
        className="pt-0"
        actions={
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowStoreDialog(true)}
          className="gap-1.5 cursor-pointer"
          id="manage-stores-btn"
        >
          <Store className="h-4 w-4" />
          <span className="hidden sm:inline">Tiendas</span>
        </Button>
        }
      />

      {cheapestResult?.cheapest && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-center gap-3"
        >
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Trophy className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">
              Mas barato: <span className="text-primary">{cheapestResult.cheapest.name}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Total estimado: ${cheapestResult.cheapest.total.toLocaleString("es-AR")} -
              {cheapestResult.cheapest.itemsCovered} item{cheapestResult.cheapest.itemsCovered !== 1 ? "s" : ""} con precio
            </p>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : storeRows.length > 0 && itemsWithPantryId.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-3 font-medium">Producto</th>
                {storeRows.map((store) => (
                  <th key={store.id} className="text-center p-3 font-medium min-w-[100px]">
                    {store.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {itemsWithPantryId.map((item) => {
                const cheapestStoreId = getCheapestStoreForItem(item.pantry_item_id)
                return (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="p-3 font-medium">{item.name}</td>
                    {storeRows.map((store) => {
                      const price = getPrice(item.pantry_item_id, store.id)
                      const isCheapest = store.id === cheapestStoreId && price !== null
                      const isEditingThis =
                        editingPrice?.storeId === store.id &&
                        editingPrice?.pantryItemId === item.pantry_item_id

                      return (
                        <td key={store.id} className="text-center p-3">
                          {isEditingThis ? (
                            <div className="flex items-center gap-1 justify-center">
                              <input
                                type="number"
                                min={0}
                                step="any"
                                value={priceValue}
                                onChange={(event) => setPriceValue(event.target.value)}
                                className="w-20 h-7 rounded border border-input bg-transparent px-2 text-sm text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                autoFocus
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") handlePriceSave()
                                  if (event.key === "Escape") setEditingPrice(null)
                                }}
                              />
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handlePriceClick(store.id, item.pantry_item_id, price)}
                              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded transition-colors cursor-pointer ${
                                isCheapest
                                  ? "bg-primary/10 text-primary font-medium"
                                  : price !== null
                                    ? "hover:bg-muted/50 text-foreground"
                                    : "text-muted-foreground hover:bg-muted/50"
                              }`}
                            >
                              {price !== null ? (
                                <>
                                  <DollarSign className="h-3 w-3" />
                                  {price.toLocaleString("es-AR")}
                                </>
                              ) : (
                                <span className="text-xs">-</span>
                              )}
                            </button>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <DollarSign className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            {storeRows.length === 0
              ? "Agrega tiendas para comparar precios"
              : "Agrega productos a la lista de compras para comparar"}
          </p>
          {storeRows.length === 0 && (
            <Button
              variant="outline"
              className="mt-4 cursor-pointer"
              onClick={() => setShowStoreDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar tienda
            </Button>
          )}
        </motion.div>
      )}

      <Dialog open={showStoreDialog} onOpenChange={setShowStoreDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Tiendas</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <form
              onSubmit={(event) => {
                event.preventDefault()
                if (newStoreName.trim()) createStore.mutate({ name: newStoreName.trim() })
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={newStoreName}
                onChange={(event) => setNewStoreName(event.target.value)}
                placeholder="Nombre de tienda..."
                className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                id="store-name-input"
              />
              <Button
                type="submit"
                size="sm"
                disabled={createStore.isPending || !newStoreName.trim()}
                className="cursor-pointer"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </form>

            {storeRows.map((store) => (
              <div
                key={store.id}
                className="flex items-center justify-between rounded-lg border p-2.5"
              >
                <span className="text-sm font-medium">{store.name}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Eliminar tienda ${store.name}`}
                  onClick={() => deleteStore.mutate({ id: store.id })}
                  className="h-7 w-7 text-destructive hover:text-destructive cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}

            {storeRows.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay tiendas registradas
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
