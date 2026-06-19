import * as React from "react"

import { cn } from "@/lib/utils"

type ModuleShellWidth = "narrow" | "default" | "wide"

const widthClass: Record<ModuleShellWidth, string> = {
  narrow: "max-w-2xl",
  default: "max-w-4xl",
  wide: "max-w-5xl",
}

export function ModuleShell({
  children,
  className,
  contentClassName,
  width = "default",
}: {
  children: React.ReactNode
  className?: string
  contentClassName?: string
  width?: ModuleShellWidth
}) {
  return (
    <div className={cn("flex-1 w-full h-full bg-background lg:p-4", className)}>
      <div
        className={cn(
          widthClass[width],
          "mx-auto space-y-6 pb-20 lg:pb-8 relative min-h-[calc(100vh-80px)] px-4 lg:px-0 pt-4 lg:pt-0",
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  )
}
