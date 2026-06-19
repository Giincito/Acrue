"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CheckCircle2, Command, Home, MoreHorizontal, Wallet } from "lucide-react"
import { cn } from "@/lib/utils"

const MOBILE_NAV_ITEMS = [
  { name: "Inicio", href: "/", icon: Home },
  { name: "Tareas", href: "/tareas", icon: CheckCircle2 },
  { name: "Finanzas", href: "/finanzas", icon: Wallet },
  { name: "Más", href: "/configuracion", icon: MoreHorizontal },
]

export function BottomNav() {
  const pathname = usePathname()

  const openCommandMenu = () => {
    window.dispatchEvent(new CustomEvent("acrue:open-cmdk"))
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 grid h-16 w-full grid-cols-5 items-center border-t bg-background/80 backdrop-blur-md md:hidden pb-safe">
      {MOBILE_NAV_ITEMS.slice(0, 2).map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 text-muted-foreground",
              isActive ? "text-accent" : ""
            )}
          >
            <item.icon className={cn("h-5 w-5", isActive && "fill-current opacity-20")} />
            <span className="text-[10px] font-medium">{item.name}</span>
          </Link>
        )
      })}
      <button
        type="button"
        aria-label="Abrir comando global"
        data-command-trigger="true"
        onClick={openCommandMenu}
        className="mx-auto flex size-12 -translate-y-2 cursor-pointer items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-transform duration-150 hover:scale-[1.03] active:scale-95"
      >
        <Command className="h-5 w-5" aria-hidden="true" />
      </button>
      {MOBILE_NAV_ITEMS.slice(2).map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 text-muted-foreground",
              isActive ? "text-accent" : ""
            )}
          >
            <item.icon className={cn("h-5 w-5", isActive && "fill-current opacity-20")} />
            <span className="text-[10px] font-medium">{item.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}
