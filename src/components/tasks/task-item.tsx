"use client"

import * as React from "react"
import { motion, useAnimation, PanInfo } from "framer-motion"
import { useDrag } from "@use-gesture/react"
import { Check, Trash2, CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Task } from "@/store/useTaskStore"

interface TaskItemProps {
  task: Task
  onComplete: (id: string) => void
  onDelete: (id: string) => void
  onClick?: (task: Task) => void
}

const SWIPE_THRESHOLD = 80

export function TaskItem({ task, onComplete, onDelete, onClick }: TaskItemProps) {
  const controls = useAnimation()
  const isCompleted = task.status === "completed"

  const bind = useDrag(
    ({ down, movement: [mx], direction: [dx], velocity: [vx] }) => {
      // Don't allow swipe on desktop (rough heuristic)
      if (typeof window !== 'undefined' && window.innerWidth > 1024) return

      if (down) {
        controls.start({ x: mx, transition: { type: "tween", duration: 0.1 } })
      } else {
        // Swipe Right to Complete (if not completed)
        if (mx > SWIPE_THRESHOLD && !isCompleted) {
          controls.start({ x: window.innerWidth, transition: { duration: 0.2 } }).then(() => {
            onComplete(task.id)
            controls.set({ x: 0 })
          })
        } 
        // Swipe Left to Delete
        else if (mx < -SWIPE_THRESHOLD) {
          controls.start({ x: -window.innerWidth, transition: { duration: 0.2 } }).then(() => {
            onDelete(task.id)
            controls.set({ x: 0 })
          })
        } 
        // Spring back
        else {
          controls.start({ x: 0, transition: { type: "spring", stiffness: 300, damping: 30 } })
        }
      }
    },
    { filterTaps: true }
  )

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onComplete(task.id)
  }

  // Priority color/indicator
  const priorityColors = {
    1: "bg-red-500", // High
    2: "bg-yellow-500", // Medium
    3: "bg-blue-500", // Low
  }

  return (
    <div className="relative overflow-hidden mb-2 rounded-lg touch-pan-y group">
      {/* Background Actions (revealed on swipe) */}
      <div className="absolute inset-0 flex justify-between items-center px-4 rounded-lg bg-muted">
        <div className="flex items-center text-primary font-medium">
          <Check className="w-5 h-5 mr-2" /> Completar
        </div>
        <div className="flex items-center text-destructive font-medium">
          Eliminar <Trash2 className="w-5 h-5 ml-2" />
        </div>
      </div>

      {/* Foreground Draggable Card */}
      <motion.div
        {...(bind() as any)}
        animate={controls}
        layout
        onClick={() => onClick?.(task)}
        className={cn(
          "relative flex items-center p-4 bg-background border rounded-lg shadow-sm cursor-pointer select-none ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground",
          isCompleted && "opacity-60 grayscale"
        )}
      >
        {/* Priority Indicator */}
        <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-lg", priorityColors[task.priority as keyof typeof priorityColors] || priorityColors[2])} />

        {/* Checkbox */}
        <button
          onClick={handleCheckboxClick}
          className={cn(
            "flex-shrink-0 w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center transition-all",
            isCompleted 
              ? "bg-[#2282fa] border-[#2282fa] text-white" 
              : "border-muted-foreground/30 hover:border-[#2282fa]"
          )}
        >
          {isCompleted && (
             <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <Check className="w-3.5 h-3.5" strokeWidth={3} />
            </motion.div>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <p className={cn(
            "text-sm font-medium truncate mb-1 transition-all",
            isCompleted && "line-through text-muted-foreground"
          )}>
            {task.title}
          </p>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {task.context_tag && (
              <span className="inline-flex items-center rounded-sm bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground">
                {task.context_tag}
              </span>
            )}
            {task.due_at && (
              <span className="flex items-center shrink-0">
                <CalendarIcon className="mr-1 h-3 w-3" />
                {format(new Date(task.due_at), "d MMM", { locale: es })}
              </span>
            )}
            {task.is_recurring && (
              <span className="inline-flex items-center justify-center shrink-0 w-4 h-4 rounded-full border border-muted-foreground/30 text-[10px]" title="Recurrente">
                R
              </span>
            )}
            {task.project_id && (
               <div className="w-2 h-2 rounded-full bg-border" title="Parte de un proyecto" />
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
