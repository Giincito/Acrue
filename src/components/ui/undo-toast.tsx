import { toast } from 'sonner'

interface UndoToastProps {
  message: string
  onUndo: () => void
  undoId?: string
  duration?: number
}

/**
 * Displays a confirmation toast with a visible 5-second countdown bar.
 * If undoId is provided, calls POST /api/undo on the server when the user
 * clicks "Deshacer". The countdown bar uses a CSS animation for smooth decay.
 */
export function showUndoToast({ message, onUndo, undoId, duration = 5000 }: UndoToastProps) {
  toast(message, {
    duration,
    // Sonner renders the description slot — we use it for the progress bar
    description: undefined,
    action: {
      label: 'Deshacer',
      onClick: async () => {
        onUndo()
        if (undoId) {
          try {
            const res = await fetch('/api/undo', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ undoId }),
            })
            const data = await res.json()
            if (!res.ok) {
              toast.error(data.error ?? 'No se pudo deshacer')
            }
          } catch {
            toast.error('Error de conexión al intentar deshacer')
          }
        }
      },
    },
    // Sonner's built-in rich colors
    className: 'undo-toast',
    style: {
      '--toast-progress-bar-color': 'hsl(var(--accent))',
    } as React.CSSProperties,
  })
}
