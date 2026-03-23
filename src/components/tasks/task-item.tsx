"use client"

import * as React from "react"
import { motion, useAnimation, PanInfo } from "framer-motion"
import { useDrag } from "@use-gesture/react"
import { Check, Trash2, CalendarIcon } from "lucide-react"
import { format, isValid } from "date-fns"
import { es } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Task } from "@/store/useTaskStore"
import { TaskIcon } from "@/components/ui/TaskIcon"

interface TaskItemProps {
  task: Task
  onComplete: (id: string) => void
  onUncomplete?: (id: string) => void
  onRestore?: (id: string) => void
  onDelete: (id: string) => void
  onClick?: (task: Task) => void
}

const SWIPE_THRESHOLD = 80

export function TaskItem({ task, onComplete, onUncomplete, onRestore, onDelete, onClick }: TaskItemProps) {
  const [isSwiping, setIsSwiping] = React.useState(false)
  const controls = useAnimation()
  const isCompleted = task.status === "completed"
  const isTrash = task.status === "trash"

  const bind = useDrag(
    ({ down, movement: [mx], first, last }) => {
      if (first) setIsSwiping(true)
      if (last) {
        setTimeout(() => setIsSwiping(false), 200)
      }

      if (down) {
        // Zero-resistance real-time pixel tracking
        controls.set({ x: mx })
      } else {
        if (mx > SWIPE_THRESHOLD) {
          controls.start({ x: window.innerWidth, transition: { type: "spring", stiffness: 400, damping: 30 } }).then(() => {
            if (isTrash && onRestore) {
              onRestore(task.id)
            } else if (isCompleted && onUncomplete) {
              onUncomplete(task.id)
            } else if (!isCompleted && !isTrash) {
              onComplete(task.id)
            }
            controls.set({ x: 0 })
          })
        } else if (mx < -SWIPE_THRESHOLD) {
          controls.start({ x: -window.innerWidth, transition: { type: "spring", stiffness: 400, damping: 30 } }).then(() => {
            onDelete(task.id)
            controls.set({ x: 0 })
          })
        } else {
          controls.start({ x: 0, transition: { type: "spring", stiffness: 500, damping: 35 } })
        }
      }
    },
    { filterTaps: true }
  )

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isTrash && onRestore) {
      onRestore(task.id)
    } else if (isCompleted && onUncomplete) {
      onUncomplete(task.id)
    } else if (!isCompleted && !isTrash) {
      onComplete(task.id)
    }
  }

  // Priority color/indicator
  const priorityColors = {
    1: "bg-red-500", // High
    2: "bg-yellow-500", // Medium
    3: "bg-blue-500", // Low
  }

  return (
    <div className="relative overflow-hidden mb-2 rounded-lg touch-pan-y group isolate">
      {/* Background Actions (revealed on swipe) */}
      <div className={cn(
        "absolute inset-0 flex justify-between items-center px-4 rounded-lg bg-muted z-0 transition-opacity duration-200",
        !isSwiping && "opacity-0"
      )}>
        <div className="flex items-center font-medium">
          <Check className={cn("w-5 h-5 mr-2", (isCompleted || isTrash) ? "text-muted-foreground" : "text-primary")} /> 
          <span className={cn((isCompleted || isTrash) ? "text-muted-foreground" : "text-primary")}>
            {isTrash ? "Deshacer" : isCompleted ? "Deshacer" : "Completar"}
          </span>
        </div>
        <div className="flex items-center text-destructive font-medium">
          Eliminar <Trash2 className="w-5 h-5 ml-2" />
        </div>
      </div>

      {/* Foreground Draggable Card */}
      <motion.div
        {...(bind() as any)}
        animate={controls}
        whileHover={{ scale: 1.002, y: -1 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onClick?.(task)}
        className={cn(
          "relative overflow-hidden flex items-center p-4 bg-white/70 dark:bg-white/5 backdrop-blur-xl rounded-xl cursor-pointer select-none transition-colors duration-300 z-10 shadow-sm hover:shadow-md ring-1 ring-black/5 dark:ring-white/10",
          isCompleted && "text-muted-foreground/80"
        )}
      >
        {/* Priority Indicator */}
        <div className={cn("absolute left-0 top-0 bottom-0 w-1 opacity-70 rounded-l-lg", priorityColors[task.priority as keyof typeof priorityColors] || priorityColors[2])} />

        {/* Checkbox / Restore indicator */}
        <button
          onClick={handleCheckboxClick}
          className={cn(
            "flex-shrink-0 w-6 h-6 rounded-full border mr-4 flex items-center justify-center transition-all duration-300 cursor-pointer",
            isCompleted 
              ? "bg-primary border-primary text-primary-foreground shadow-sm" 
              : "border-muted-foreground/40 hover:border-primary hover:bg-primary/10 hover:scale-110 shadow-sm"
          )}
        >
          {isCompleted && !isTrash && (
             <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <Check className="w-3.5 h-3.5" strokeWidth={3} />
            </motion.div>
          )}
          {isTrash && (
            <motion.div>
              <Trash2 className="w-3 h-3 text-muted-foreground" />
            </motion.div>
          )}
        </button>

        {/* Content */}
          <div className="flex-1 min-w-0 flex flex-row items-center gap-4 overflow-hidden pr-2">
            <div className="flex items-center gap-2 shrink-0 truncate">
              <TaskIcon icon={task.icon} size={16} />
              <p className={cn(
                "text-sm font-medium truncate transition-all text-foreground",
                isCompleted && "line-through text-muted-foreground opacity-80"
              )}>
                {task.title}
              </p>
            </div>
            
            <div className={cn(
              "flex flex-nowrap items-center gap-2 text-xs font-medium text-muted-foreground/80 dark:text-muted-foreground shrink-0 overflow-hidden ml-auto",
              isCompleted && "opacity-40 grayscale"
            )}>
              {task.context_tag && (
                <span className="inline-flex items-center rounded-sm bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground truncate max-w-[130px]">
                  {task.context_tag}
                </span>
              )}
              {task.due_at && isValid(new Date(task.due_at)) && (
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
                <div className="w-2 h-2 rounded-full bg-border shrink-0" title="Parte de un proyecto" />
              )}
            </div>

            {isCompleted && !isTrash && (
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(task.id)
                }} 
                className="ml-2 p-2 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-destructive/10 shrink-0"
                title="Eliminar tarea"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            {isTrash && (
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  if (onRestore) onRestore(task.id)
                }} 
                className="ml-2 px-3 py-1 text-xs font-medium text-accent hover:text-accent-foreground border border-accent hover:bg-accent transition-colors rounded-md shrink-0"
                title="Deshacer borrado"
              >
                Deshacer
              </button>
            )}
          </div>
      </motion.div>
    </div>
  )
}
