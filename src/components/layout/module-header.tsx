import * as React from "react"

import { cn } from "@/lib/utils"

export function ModuleEyebrow({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <p className={cn("text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground", className)}>
      {children}
    </p>
  )
}

export function ModuleHeader({
  module,
  title,
  description,
  actions,
  className,
}: {
  module: string
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <header className={cn("mb-6 flex flex-col gap-4 pt-8 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <ModuleEyebrow>{module}</ModuleEyebrow>
        <h1 className="mt-2 text-2xl font-medium text-foreground">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  )
}
