'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export function DegradedNotice({
  title = 'Datos parciales',
  detail,
  actionLabel = 'Reintentar',
  onRetry,
  className,
}: {
  title?: string
  detail: string
  actionLabel?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/50 px-4 py-3 text-sm leading-6 text-muted-foreground sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-medium text-foreground">{title}</p>
          <p>{detail}</p>
        </div>
      </div>

      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          aria-label={actionLabel}
          className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-[background-color,border-color] duration-150 ease-out hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
