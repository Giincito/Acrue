"use client"

import { trpc } from "@/lib/trpc"
import { motion } from "framer-motion"
import { Handshake, Loader2, ArrowUpRight, ArrowDownRight } from "lucide-react"

export function DebtWidget() {
  const { data: debts, isLoading } = trpc.debts.list.useQuery()

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-4 flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const activeDebts = debts?.filter(d => d.status !== 'settled') || []
  if (activeDebts.length === 0) return null

  const owedToMe = activeDebts.filter(d => d.type === 'owed_to_me')
  const iOwe = activeDebts.filter(d => d.type === 'i_owe')

  const totalOwedToMe = owedToMe.reduce((sum, d) => sum + (d.total_amount - d.paid_amount), 0)
  const totalIOwe = iOwe.reduce((sum, d) => sum + (d.total_amount - d.paid_amount), 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/50 bg-card p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Handshake className="h-4 w-4" />
          Deudas activas
        </h2>
        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
          {activeDebts.length}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 bg-success/5 p-3 rounded-lg border border-success/10">
          <div className="flex items-center gap-1.5 text-xs font-medium text-success mb-1">
            <ArrowUpRight className="h-3.5 w-3.5" />
            Me deben
          </div>
          <p className="text-lg font-medium tabular-nums text-success">
             ${totalOwedToMe.toLocaleString("es-AR")}
          </p>
        </div>

        <div className="space-y-1 bg-destructive/5 p-3 rounded-lg border border-destructive/10">
          <div className="flex items-center gap-1.5 text-xs font-medium text-destructive mb-1">
            <ArrowDownRight className="h-3.5 w-3.5" />
            Les debo
          </div>
          <p className="text-lg font-medium tabular-nums text-destructive">
             ${totalIOwe.toLocaleString("es-AR")}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
