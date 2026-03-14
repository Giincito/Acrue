"use client"

import { MessageSquarePlus } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ChatBotFab() {
  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-8 z-50">
      <Button
        size="icon"
        className="h-14 w-14 rounded-full bg-[#2282fa] hover:bg-[#2282fa]/90 text-white shadow-lg transition-transform hover:scale-105"
        onClick={() => console.log('Open ChatBot')}
      >
        <MessageSquarePlus className="h-6 w-6" />
        <span className="sr-only">Abrir Asistente AI</span>
      </Button>
    </div>
  )
}
