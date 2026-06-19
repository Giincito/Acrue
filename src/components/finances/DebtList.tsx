"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import {
  Handshake,
  Plus,
  Loader2,
  Trash2,
  CheckCircle2,
  MinusCircle,
  PlusCircle,
  History
} from "lucide-react"
import { ModuleHeader } from "@/components/layout/module-header"
import { Button } from "@/components/ui/button"
import { showUndoToast } from "@/components/ui/undo-toast"
import { DebtFormModal } from "./DebtFormModal"
import { DebtPaymentModal } from "./DebtPaymentModal"

type DebtType = "owed_to_me" | "i_owe"
type DebtStatus = "pending" | "partial" | "settled"

interface Debt {
  id: string
  name: string
  person: string
  type: DebtType
  total_amount: number
  paid_amount: number
  currency: string
  due_date: string | null
  status: DebtStatus
}

export function DebtList() {
  const [showForm, setShowForm] = useState(false)
  const [paymentDebt, setPaymentDebt] = useState<{ id: string, maxAmount: number } | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  const utils = trpc.useUtils()
  const { data: debts, isLoading } = trpc.debts.list.useQuery()

  const deleteDebt = trpc.debts.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.debts.list.cancel()
      const previousDebts = utils.debts.list.getData()
      
      utils.debts.list.setData(undefined, (old: Debt[] | undefined) => {
        if (!old) return old
        return old.filter((debt) => debt.id !== id)
      })
      
      return { previousDebts }
    },
    onSuccess: () => {
      toast.success("Deuda eliminada")
    },
    onError: (err, variables, context) => {
      utils.debts.list.setData(undefined, context?.previousDebts)
      toast.error(err.message)
    },
    onSettled: () => {
      utils.debts.list.invalidate()
    }
  })

  const settleDebt = trpc.debts.settle.useMutation({
    onMutate: async ({ id }) => {
      await utils.debts.list.cancel()
      const previousDebts = utils.debts.list.getData()
      
      utils.debts.list.setData(undefined, (old: Debt[] | undefined) => {
        if (!old) return old
        return old.map((debt) =>
          debt.id === id ? { ...debt, status: 'settled', paid_amount: debt.total_amount } : debt
        )
      })
      
      return { previousDebts }
    },
    onSuccess: (_data, variables, context) => {
      // Find previous state from our context/snapshot to pass to undo
      const prev = context?.previousDebts?.find((debt) => debt.id === variables.id)
      
      showUndoToast({
        message: "Deuda saldada",
        undoId: undefined, // custom local undo
        onUndo: () => {
          undoSettle.mutate({ 
            id: variables.id, 
            previous_paid_amount: prev?.paid_amount || 0,
            previous_status: prev?.status === "partial" ? "partial" : "pending",
          })
        }
      })
    },
    onError: (err, variables, context) => {
      utils.debts.list.setData(undefined, context?.previousDebts)
      toast.error(err.message)
    },
    onSettled: () => {
      utils.debts.list.invalidate()
    }
  })

  const undoSettle = trpc.debts.undoSettle.useMutation({
    onSuccess: () => {
        utils.debts.list.invalidate()
        toast.success("Saldado deshecho correctamente")
    }
  })

  const activeDebts = debts?.filter(d => d.status !== 'settled') || []
  const settledDebts = debts?.filter(d => d.status === 'settled') || []

  const owedToMe = activeDebts.filter(d => d.type === 'owed_to_me')
  const iOwe = activeDebts.filter(d => d.type === 'i_owe')

  const totalOwedToMe = owedToMe.reduce((sum, d) => sum + (d.total_amount - d.paid_amount), 0)
  const totalIOwe = iOwe.reduce((sum, d) => sum + (d.total_amount - d.paid_amount), 0)

  // Render a specific section of debts
  const renderDebtGroup = (items: Debt[], isOwedToMe: boolean) => {
    return (
        <div className="space-y-3 mt-3">
          <AnimatePresence>
            {items.map((debt, i) => {
              const progress = debt.total_amount > 0
                ? Math.min((debt.paid_amount / debt.total_amount) * 100, 100)
                : 0
                
              const remaining = debt.total_amount - debt.paid_amount
              const isSettled = debt.status === 'settled'

              return (
                <motion.div
                  key={debt.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                  className={`group rounded-xl border p-4 transition-colors ${
                      isSettled ? "border-muted bg-muted/20" : "border-border/50 bg-card"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isSettled ? "bg-muted text-muted-foreground" : 
                        isOwedToMe ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                      }`}>
                      {isSettled ? <CheckCircle2 className="h-5 w-5" /> : 
                       isOwedToMe ? <PlusCircle className="h-5 w-5" /> : <MinusCircle className="h-5 w-5" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium truncate">{debt.name}</p>
                            <p className="text-xs text-muted-foreground">{debt.person}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          {!isSettled && (
                              <button
                                type="button"
                                onClick={() => settleDebt.mutate({ id: debt.id })}
                                disabled={settleDebt.isPending}
                                className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-primary/10 cursor-pointer disabled:opacity-50"
                                aria-label="Saldar deuda"
                                title="Saldar deuda"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                              </button>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteDebt.mutate({ id: debt.id })}
                            className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-destructive/10 cursor-pointer"
                            aria-label="Eliminar deuda"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-muted-foreground tabular-nums">
                            Pagado: ${debt.paid_amount.toLocaleString("es-AR")}
                          </span>
                          <span className="font-medium tabular-nums">
                            Total: ${debt.total_amount.toLocaleString("es-AR")}
                          </span>
                        </div>
                        <div className={`h-1.5 w-full rounded-full overflow-hidden ${isSettled ? 'bg-muted' : 'bg-muted/50'}`}>
                          <motion.div
                            className={`h-full rounded-full ${isSettled ? 'bg-muted-foreground' : isOwedToMe ? "bg-success" : "bg-destructive"}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                           <span className="text-[10px] text-muted-foreground tabular-nums">
                              Resta: ${remaining.toLocaleString("es-AR")}
                           </span>
                          {debt.due_date && !isSettled && (
                            <span className="text-[10px] text-muted-foreground">
                              Vence: {" "}
                              {new Date(debt.due_date).toLocaleDateString("es-AR", {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                          )}
                        </div>
                      </div>

                      {!isSettled && (
                        <div className="flex justify-end gap-2 mt-3">
                           <Button
                              variant="secondary"
                              size="sm"
                              className="h-7 text-xs cursor-pointer"
                              onClick={() => setPaymentDebt({ id: debt.id, maxAmount: remaining })}
                           >
                              Pago parcial
                           </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
    )
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        module="Finanzas"
        title="Deudas"
        description="Gestion de plata prestada."
        className="pt-0"
        actions={
          <Button
          size="sm"
          onClick={() => setShowForm(true)}
          className="gap-1.5 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nueva deuda</span>
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : activeDebts.length > 0 || settledDebts.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Owed to me */}
            <div className="space-y-1">
               <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                     <PlusCircle className="h-4 w-4 text-success" />
                     Me deben
                  </h3>
                  <div className="text-sm font-medium text-success">
                     ${totalOwedToMe.toLocaleString("es-AR")}
                  </div>
               </div>
               
               {owedToMe.length > 0 ? (
                  renderDebtGroup(owedToMe, true)
               ) : (
                  <div className="text-sm text-muted-foreground py-4 text-center bg-muted/30 rounded-xl mt-3 border border-dashed">
                     Nadie te debe plata
                  </div>
               )}
            </div>

            {/* I owe */}
            <div className="space-y-1">
               <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                     <MinusCircle className="h-4 w-4 text-destructive" />
                     Les debo
                  </h3>
                  <div className="text-sm font-medium text-destructive">
                     ${totalIOwe.toLocaleString("es-AR")}
                  </div>
               </div>
               
               {iOwe.length > 0 ? (
                  renderDebtGroup(iOwe, false)
               ) : (
                  <div className="text-sm text-muted-foreground py-4 text-center bg-muted/30 rounded-xl mt-3 border border-dashed">
                     No le debes a nadie
                  </div>
               )}
            </div>
          </div>

          {/* Settle History */}
          {settledDebts.length > 0 && (
             <div className="pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-full text-left"
                >
                   <History className="h-4 w-4" />
                   {showHistory ? "Ocultar historial" : `Ver historial (${settledDebts.length})`}
                </button>
                
                <AnimatePresence>
                   {showHistory && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mt-4 grid grid-cols-1 md:grid-cols-2 gap-4"
                      >
                         {renderDebtGroup(settledDebts, true)}
                      </motion.div>
                   )}
                </AnimatePresence>
             </div>
          )}
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <Handshake className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No tienes deudas activas</p>
          <Button
            variant="outline"
            className="mt-4 cursor-pointer"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Registrar deuda
          </Button>
        </motion.div>
      )}

      {/* Forms and Modals */}
      <DebtFormModal
        open={showForm}
        onOpenChange={setShowForm}
        onSuccess={() => utils.debts.list.invalidate()}
      />

      <DebtPaymentModal
        debtId={paymentDebt?.id || null}
        maxAmount={paymentDebt?.maxAmount || 0}
        onClose={() => setPaymentDebt(null)}
        onSuccess={() => utils.debts.list.invalidate()}
      />
    </div>
  )
}
