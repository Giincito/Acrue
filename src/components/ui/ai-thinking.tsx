"use client"

import { BrainCircuit } from "lucide-react"

export function AiThinking({ text = "La IA está pensando..." }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
      <BrainCircuit className="h-4 w-4 text-[#2282fa]" />
      <span>{text}</span>
    </div>
  )
}
