"use client"

import React, { ComponentType } from "react"
import { ErrorBoundary, FallbackProps } from "react-error-boundary"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

function DefaultErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center rounded-lg border bg-destructive/10 text-destructive my-4">
      <AlertTriangle className="h-8 w-8 mb-2" />
      <h3 className="text-lg font-medium tracking-tight">Algo salió mal</h3>
      <p className="text-sm mt-1 mb-4 opacity-80">{error instanceof Error ? error.message : String(error)}</p>
      <Button variant="outline" onClick={resetErrorBoundary}>
        Reintentar
      </Button>
    </div>
  )
}

export function withFallback<P extends object>(
  Component: ComponentType<P>,
  Fallback: ComponentType<FallbackProps> = DefaultErrorFallback
) {
  return function WithFallback(props: P) {
    return (
      <ErrorBoundary FallbackComponent={Fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}
