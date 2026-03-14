"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
// Limit mobile items to core functions to fit the screen
import { 
  CheckCircle2, 
  Calendar, 
  Wallet, 
  Activity, 
  Menu
} from "lucide-react"

const MOBILE_NAV_ITEMS = [
  { name: "Tareas", href: "/tasks", icon: CheckCircle2 },
  { name: "Calend.", href: "/calendar", icon: Calendar },
  { name: "Home", href: "/", icon: Menu }, // Menu or central hub
  { name: "Finanzas", href: "/finances", icon: Wallet },
  { name: "Hábitos", href: "/habits", icon: Activity },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 w-full items-center justify-around border-t bg-background/80 backdrop-blur-md md:hidden pb-safe">
      {MOBILE_NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full gap-1 text-muted-foreground",
              isActive ? "text-[#2282fa]" : ""
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
