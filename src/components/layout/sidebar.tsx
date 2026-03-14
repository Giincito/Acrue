"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  CheckCircle2, 
  Calendar, 
  BookOpen, 
  FolderKanban, 
  Wallet, 
  ShoppingCart, 
  UtensilsCrossed, 
  Activity, 
  Brain, 
  Gift 
} from "lucide-react"

const NAV_ITEMS = [
  { name: "Tareas", href: "/tasks", icon: CheckCircle2 },
  { name: "Calendario", href: "/calendar", icon: Calendar },
  { name: "Estudio", href: "/study", icon: BookOpen },
  { name: "Proyectos", href: "/projects", icon: FolderKanban },
  { name: "Finanzas", href: "/finances", icon: Wallet },
  { name: "Despensa", href: "/pantry", icon: ShoppingCart },
  { name: "Recetas", href: "/recipes", icon: UtensilsCrossed },
  { name: "Hábitos", href: "/habits", icon: Activity },
  { name: "Cerebro", href: "/brain", icon: Brain },
  { name: "Wishlist", href: "/wishlist", icon: Gift },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden h-screen w-64 flex-col border-r bg-background md:flex sticky top-0">
      <div className="flex h-14 items-center border-b px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="h-6 w-6 rounded bg-[#2282fa] text-primary-foreground flex items-center justify-center font-bold text-xs">
            A
          </div>
          <span>Acrue</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="grid gap-1 px-4 text-sm font-medium">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                  isActive ? "bg-accent text-accent-foreground font-semibold" : ""
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
