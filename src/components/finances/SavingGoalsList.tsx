"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import {
  Target,
  Plus,
  Loader2,
  Trash2,
  PartyPopper,
  PiggyBank,
} from "lucide-react"
import { ModuleHeader } from "@/components/layout/module-header"
import { Button } from "@/components/ui/button"
import { SavingGoalForm } from "./SavingGoalForm"
import { AddToGoalModal } from "./AddToGoalModal"
import type { SavingGoal } from "@/types/finance"

/**
 * Saving goals list with progress bars and contribution modal.
 * Awards XP when a goal reaches 100%.
 */
export function SavingGoalsList() {
  const [showForm, setShowForm] = useState(false)
  const [addToGoalId, setAddToGoalId] = useState<string | null>(null)

  const utils = trpc.useUtils()
  const { data: goals, isLoading } = trpc.savingGoals.list.useQuery()

  const deleteGoal = trpc.savingGoals.delete.useMutation({
    onSuccess: () => {
      utils.savingGoals.list.invalidate()
      toast.success("Meta eliminada")
    },
    onError: (err) => toast.error(err.message),
  })

  return (
    <div className="space-y-4">
      <ModuleHeader
        module="Finanzas"
        title="Metas"
        description={`${goals?.length ?? 0} metas de ahorro`}
        className="pt-0"
        actions={
        <Button
          size="sm"
          onClick={() => setShowForm(true)}
          className="gap-1.5 cursor-pointer"
          id="add-goal-btn"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nueva meta</span>
        </Button>
        }
      />

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : goals && goals.length > 0 ? (
        <div className="space-y-3">
          <AnimatePresence>
            {(goals as SavingGoal[]).map((goal, i) => {
              const progress = goal.target_amount > 0
                ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
                : 0
              const isComplete = progress >= 100

              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ delay: i * 0.04 }}
                  className="group rounded-xl border border-border/50 bg-card p-4"
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${isComplete ? "bg-success/10" : "bg-primary/10"
                      }`}>
                      {isComplete ? (
                        <PartyPopper className="h-5 w-5 text-success" />
                      ) : (
                        <Target className="h-5 w-5 text-primary" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">{goal.name}</p>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => deleteGoal.mutate({ id: goal.id })}
                            className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-destructive/10 cursor-pointer"
                            aria-label="Eliminar meta"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </button>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-muted-foreground tabular-nums">
                            ${goal.current_amount.toLocaleString("es-AR")}
                          </span>
                          <span className="text-muted-foreground tabular-nums">
                            ${goal.target_amount.toLocaleString("es-AR")}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${isComplete ? "bg-success" : "bg-primary"
                              }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {progress.toFixed(0)}%
                          </span>
                          {goal.deadline && (
                            <span className="text-[10px] text-muted-foreground">
                              Fecha límite:{" "}
                              {new Date(goal.deadline).toLocaleDateString("es-AR", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Add money button */}
                      {!isComplete && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 h-7 text-xs gap-1.5 cursor-pointer"
                          onClick={() => setAddToGoalId(goal.id)}
                        >
                          <PiggyBank className="h-3.5 w-3.5" />
                          Agregar plata
                        </Button>
                      )}

                      {isComplete && (
                        <p className="text-xs text-success mt-2 font-medium flex items-center gap-1">
                          <PartyPopper className="h-3 w-3" />
                          Meta alcanzada. +50 XP
                        </p>
                      )}
                    </div>
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
            <Target className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Creá tu primera meta de ahorro</p>
          <Button
            variant="outline"
            className="mt-4 cursor-pointer"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear meta
          </Button>
        </motion.div>
      )}

      {/* Create goal form */}
      <SavingGoalForm
        open={showForm}
        onOpenChange={setShowForm}
        onSuccess={() => utils.savingGoals.list.invalidate()}
      />

      {/* Add to goal modal */}
      <AddToGoalModal
        goalId={addToGoalId}
        onClose={() => setAddToGoalId(null)}
        onSuccess={() => utils.savingGoals.list.invalidate()}
      />
    </div>
  )
}
