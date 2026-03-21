"use client"

import { MessageSquarePlus } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ChatBotFab() {
  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-8 z-50">
      <Button
        size="icon"
        className="h-14 w-14 rounded-full bg-background/80 border border-border/40 backdrop-blur-xl text-foreground shadow-lg hover:shadow-xl hover:-translate-y-1 hover:bg-accent/50 transition-all duration-300 ring-1 ring-black/5 dark:ring-white/10"
        onClick={() => console.log('Open ChatBot')}
      >
        <MessageSquarePlus className="h-6 w-6" />
        <span className="sr-only">Abrir Asistente AI</span>
      </Button>
    </div>
  )
}
