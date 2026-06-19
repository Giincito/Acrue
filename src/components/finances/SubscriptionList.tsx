"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import {
  RefreshCw,
  Plus,
  AlertTriangle,
  Loader2,
  Trash2,
  Edit2,
} from "lucide-react"
import { ModuleHeader } from "@/components/layout/module-header"
import { Button } from "@/components/ui/button"
import { SubscriptionForm } from "./SubscriptionForm"
import type { Subscription } from "@/types/finance"

interface SubscriptionWithRenewal extends Subscription {
  days_until_renewal: number
}

/**
 * Subscription management view. Shows subscriptions ordered by nearest renewal,
 * with urgency badges for renewals within 7 or 1 day.
 */
export function SubscriptionList() {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const utils = trpc.useUtils()
  const { data: subscriptions, isLoading } = trpc.subscriptions.list.useQuery()
  const subscriptionRows = (subscriptions ?? []) as SubscriptionWithRenewal[]

  const deleteSub = trpc.subscriptions.delete.useMutation({
    onSuccess: () => {
      utils.subscriptions.list.invalidate()
      toast.success("Suscripción eliminada")
    },
    onError: (err) => toast.error(err.message),
  })

  return (
    <div className="space-y-4">
      <ModuleHeader
        module="Finanzas"
        title="Suscripciones"
        description={`${subscriptionRows.filter((subscription) => subscription.active).length} activas`}
        className="pt-0"
        actions={
        <Button
          size="sm"
          onClick={() => {
            setEditingId(null)
            setShowForm(true)
          }}
          className="gap-1.5 cursor-pointer"
          id="add-subscription-btn"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nueva</span>
        </Button>
        }
      />

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : subscriptionRows.length > 0 ? (
        <div className="space-y-2">
          <AnimatePresence>
            {subscriptionRows.map((sub, i) => {
              const urgency = getUrgency(sub.days_until_renewal)
              return (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ delay: i * 0.04 }}
                  className="group flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/20 transition-colors"
                >
                  {/* Icon */}
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${sub.active ? "bg-primary/10" : "bg-muted/50"
                    }`}>
                    <RefreshCw className={`h-5 w-5 ${sub.active ? "text-primary" : "text-muted-foreground"}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium truncate ${!sub.active ? "line-through text-muted-foreground" : ""}`}>
                        {sub.name}
                      </p>
                      {!sub.active && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                          Inactiva
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        Renueva el{" "}
                        {new Date(sub.renewal_date).toLocaleDateString("es-AR", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      {urgency && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5 ${urgency.className}`}>
                          <AlertTriangle className="h-2.5 w-2.5" />
                          {urgency.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <span className="text-sm font-medium tabular-nums">
                    ${sub.amount.toLocaleString("es-AR")}
                    <span className="text-[10px] text-muted-foreground ml-0.5">
                      {sub.currency}
                    </span>
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => { setEditingId(sub.id); setShowForm(true) }}
                      className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted cursor-pointer"
                      aria-label="Editar"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSub.mutate({ id: sub.id })}
                      className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-destructive/10 cursor-pointer"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <RefreshCw className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No tenés suscripciones registradas</p>
          <Button
            variant="outline"
            className="mt-4 cursor-pointer"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar suscripción
          </Button>
        </motion.div>
      )}

      {/* Form modal */}
      <SubscriptionForm
        open={showForm}
        onOpenChange={setShowForm}
        editingId={editingId}
        subscriptions={subscriptionRows}
        onSuccess={() => utils.subscriptions.list.invalidate()}
      />
    </div>
  )
}

function getUrgency(days: number) {
  if (days <= 1) return { label: "Mañana", className: "bg-destructive/10 text-destructive" }
  if (days <= 7) return { label: `${days} días`, className: "bg-warning/10 text-warning" }
  return null
}
