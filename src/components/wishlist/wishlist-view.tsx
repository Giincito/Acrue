"use client"

import * as React from "react"
import { Check, Loader2, Plus, ShoppingBag, Trash2, Wallet } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { toast } from "sonner"

import { trpc } from "@/lib/trpc"
import { cn } from "@/lib/utils"
import { ModuleShell } from "@/components/layout/module-shell"
import { AiThinking } from "@/components/ui/ai-thinking"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type WishlistStatus = "wanted" | "saved" | "purchased"

type WishlistItem = {
  id: string
  name: string
  description: string | null
  price: number | null
  currency: string
  store: string | null
  url: string | null
  priority: number
  status: WishlistStatus
  created_at: string
}

type WishlistSuggestion = WishlistItem & {
  canBuy: boolean
  remainingAfterPurchase: number
  suggestion: string
}

const STATUS_LABELS: Record<WishlistStatus, string> = {
  wanted: "Deseado",
  saved: "Ahorrando",
  purchased: "Comprado",
}

function formatMoney(value: number | null | undefined, currency = "ARS") {
  if (!value) return "Sin precio"

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

export function WishlistView() {
  const [showForm, setShowForm] = React.useState(false)
  const utils = trpc.useUtils()
  const { data: items, isLoading } = trpc.wishlist.list.useQuery()
  const {
    data: suggestions,
    isFetching: isFetchingSuggestions,
    isLoading: isLoadingSuggestions,
  } = trpc.wishlist.suggestions.useQuery()
  const wishlistItems = (items ?? []) as WishlistItem[]
  const suggestionsById = new Map(
    ((suggestions?.items ?? []) as WishlistSuggestion[]).map((item) => [item.id, item])
  )

  const refresh = React.useCallback(() => {
    utils.wishlist.list.invalidate()
    utils.wishlist.suggestions.invalidate()
    utils.xp.summary.invalidate()
  }, [utils])

  const updateItem = trpc.wishlist.update.useMutation({
    onSuccess: (_, variables) => {
      refresh()
      toast.success(variables.status === "purchased" ? "Compra registrada. +20 XP" : "Wishlist actualizada")
    },
    onError: (err) => {
      toast.error("No se pudo actualizar el ítem", { description: err.message })
    },
  })

  const deleteItem = trpc.wishlist.delete.useMutation({
    onSuccess: () => {
      refresh()
      toast.success("Item eliminado")
    },
    onError: (err) => {
      toast.error("No se pudo eliminar el ítem", { description: err.message })
    },
  })

  return (
    <ModuleShell>
        <div className="flex items-center justify-between gap-4 pt-8">
          <div>
            <h1 className="text-2xl font-medium text-foreground">Lista de deseos</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Compras futuras cruzadas con tu saldo mensual estimado.
            </p>
          </div>
          <Button type="button" className="cursor-pointer gap-2" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Nuevo ítem</span>
          </Button>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Saldo disponible estimado</p>
              <p className="mt-1 text-2xl font-medium text-foreground tabular-nums">
                {formatMoney(suggestions?.availableBalance ?? 0, suggestions?.currency ?? "ARS")}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-muted-foreground">
              {wishlistItems.filter((item) => item.status !== "purchased").length} pendientes
            </div>
          </div>
          {(isLoadingSuggestions || isFetchingSuggestions) ? (
            <AiThinking text="Pensando..." className="mt-3" />
          ) : suggestions?.aiSummary ? (
            <p className="mt-3 text-sm text-muted-foreground">{suggestions.aiSummary}</p>
          ) : null}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-[76px] animate-pulse rounded-lg border border-border/50 bg-card" />
            ))}
          </div>
        ) : wishlistItems.length ? (
          <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
            <AnimatePresence initial={false}>
              {wishlistItems.map((item, index) => {
                const suggestion = suggestionsById.get(item.id)

                return (
                  <motion.article
                    key={item.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.16, delay: Math.min(index, 5) * 0.03 }}
                    className="group border-b border-border/50 px-4 py-3 last:border-b-0"
                  >
                    <div className="flex min-h-[68px] items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
                        {item.status === "purchased" ? (
                          <Check className="h-4 w-4 text-success" aria-hidden="true" />
                        ) : (
                          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-sm font-medium text-foreground">{item.name}</h2>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                            P{item.priority}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>{formatMoney(item.price, item.currency)}</span>
                          {item.store && <span>{item.store}</span>}
                          {suggestion && item.status !== "purchased" && (
                            <span className={suggestion.canBuy ? "text-success" : "text-muted-foreground"}>
                              {suggestion.suggestion}
                            </span>
                          )}
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Eliminar ${item.name}`}
                        className="shrink-0 cursor-pointer text-muted-foreground opacity-100 hover:text-destructive md:opacity-0 md:group-hover:opacity-100"
                        disabled={deleteItem.isPending}
                        onClick={() => deleteItem.mutate({ id: item.id })}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 pl-0 sm:pl-14">
                      {(Object.keys(STATUS_LABELS) as WishlistStatus[]).map((status) => (
                        <button
                          key={status}
                          type="button"
                          aria-label={`Cambiar ${item.name} a ${STATUS_LABELS[status]}`}
                          disabled={updateItem.isPending || item.status === status}
                          onClick={() => updateItem.mutate({ id: item.id, status })}
                          className={cn(
                            "h-9 cursor-pointer rounded-lg border px-3 text-xs font-medium transition-colors",
                            item.status === status
                              ? "border-accent bg-accent/10 text-accent"
                              : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                            "disabled:cursor-not-allowed disabled:opacity-70"
                          )}
                        >
                          {STATUS_LABELS[status]}
                        </button>
                      ))}
                    </div>
                  </motion.article>
                )
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/70 px-6 text-center">
            <Wallet className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <h2 className="mt-4 text-base font-medium text-foreground">Wishlist vacía.</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              Guardá compras posibles y revisá si encajan con tu saldo mensual.
            </p>
            <Button type="button" variant="outline" className="mt-4 cursor-pointer gap-2" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nuevo ítem
            </Button>
          </div>
        )}

        <WishlistForm
          open={showForm}
          onOpenChange={setShowForm}
          onSuccess={() => {
            refresh()
            setShowForm(false)
          }}
        />
    </ModuleShell>
  )
}

function WishlistForm({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [name, setName] = React.useState("")
  const [price, setPrice] = React.useState("")
  const [store, setStore] = React.useState("")
  const [url, setUrl] = React.useState("")
  const [priority, setPriority] = React.useState(2)

  const createItem = trpc.wishlist.create.useMutation({
    onSuccess: () => {
      toast.success("Item agregado")
      setName("")
      setPrice("")
      setStore("")
      setUrl("")
      setPriority(2)
      onSuccess()
    },
    onError: (err) => {
      toast.error("No se pudo crear el ítem", { description: err.message })
    },
  })

  const canSubmit = name.trim().length > 0

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return

    createItem.mutate({
      name: name.trim(),
      price: price ? Number(price) : null,
      currency: "ARS",
      store: store.trim() || null,
      url: url.trim() || null,
      priority,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo ítem</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="wishlist-name" className="text-sm font-medium text-foreground">
              Nombre
            </label>
            <input
              id="wishlist-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej: Monitor"
              className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
              autoFocus
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="wishlist-price" className="text-sm font-medium text-foreground">
                Precio
              </label>
              <input
                id="wishlist-price"
                type="number"
                min={0}
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="wishlist-priority" className="text-sm font-medium text-foreground">
                Prioridad
              </label>
              <select
                id="wishlist-priority"
                value={priority}
                onChange={(event) => setPriority(Number(event.target.value))}
                className="flex h-11 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
              >
                <option value={1}>Alta</option>
                <option value={2}>Media</option>
                <option value={3}>Baja</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="wishlist-store" className="text-sm font-medium text-foreground">
              Tienda
            </label>
            <input
              id="wishlist-store"
              type="text"
              value={store}
              onChange={(event) => setStore(event.target.value)}
              className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="wishlist-url" className="text-sm font-medium text-foreground">
              URL
            </label>
            <input
              id="wishlist-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!canSubmit || createItem.isPending} className="cursor-pointer gap-2">
              {createItem.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Agregar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
