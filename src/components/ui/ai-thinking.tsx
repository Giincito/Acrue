"use client"

import { cn } from "@/lib/utils"

export function AiThinking({
  text = "Pensando...",
  className,
}: {
  text?: string
  className?: string
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex items-center gap-2 text-xs font-normal text-muted-foreground", className)}
    >
      <span className="flex items-center gap-1" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, index) => (
          <span
            key={index}
            className="size-1.5 rounded-full bg-muted-foreground/80 motion-safe:animate-[ai-thinking-wave_600ms_ease-in-out_infinite] motion-reduce:animate-none motion-reduce:opacity-50"
            style={{ animationDelay: `${index * 100}ms` }}
          />
        ))}
      </span>
      {text ? <span>{text}</span> : <span className="sr-only">Procesando</span>}
    </div>
  )
}
