import { toast } from "sonner"

interface UndoToastProps {
  message: string
  onUndo: () => void
  duration?: number
}

// Custom hook / helper to trigger the Undo toast
export function showUndoToast({ message, onUndo, duration = 5000 }: UndoToastProps) {
  toast(message, {
    duration,
    action: {
      label: "Deshacer",
      onClick: onUndo,
    },
  })
}
