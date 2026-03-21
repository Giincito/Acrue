"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/ui/theme-toggle"
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
  Gift,
  Settings,
  ChevronDown,
  Tags,
  Flag,
  Trash2,
  ListTodo
} from "lucide-react"

const NAV_ITEMS = [
  { 
    id: "tareas", 
    name: "Tareas", 
    href: "/tareas", 
    icon: CheckCircle2,
    subItems: [
      { name: "Lista Principal", href: "/tareas", icon: ListTodo },
      { name: "Proyectos", href: "/tareas/proyectos", icon: FolderKanban },
      { name: "Etiquetas", href: "/tareas/etiquetas", icon: Tags },
      { name: "Prioridades", href: "/tareas/prioridades", icon: Flag },
      { name: "Papelera", href: "/tareas/papelera", icon: Trash2 },
    ]
  },
  { id: "calendario", name: "Calendario", href: "/calendario", icon: Calendar },
  { id: "estudio", name: "Estudio", href: "/study", icon: BookOpen },
  { id: "finanzas", name: "Finanzas", href: "/finances", icon: Wallet },
  { id: "despensa", name: "Despensa", href: "/pantry", icon: ShoppingCart },
  { id: "recetas", name: "Recetas", href: "/recipes", icon: UtensilsCrossed },
  { id: "habitos", name: "Hábitos", href: "/habits", icon: Activity },
  { id: "cerebro", name: "Cerebro", href: "/brain", icon: Brain },
  { id: "wishlist", name: "Deseos", href: "/wishlist", icon: Gift },
]

export function Sidebar() {
  const pathname = usePathname()
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({
    tareas: true // Default expanded
  })
  
  const [activeModules, setActiveModules] = React.useState<Record<string, boolean>>({
    tareas: true,
    calendario: true,
    estudio: true,
    finanzas: true,
    // Add default true for others or omit them if they aren't toggleable yet
  })

  React.useEffect(() => {
    const loadModules = () => {
      const saved = localStorage.getItem('acrue_modules')
      if (saved) {
        setActiveModules(JSON.parse(saved))
      }
    }
    loadModules()
    window.addEventListener('acrue_modules_changed', loadModules)
    return () => window.removeEventListener('acrue_modules_changed', loadModules)
  }, [])

  const filteredNavItems = NAV_ITEMS.filter(item => {
    // If it's a known module with a toggle, respect it
    if (activeModules.hasOwnProperty(item.id)) {
      return activeModules[item.id]
    }
    // Otherwise show it by default
    return true
  })

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <aside className="hidden h-screen w-64 flex-col border-r border-border/40 bg-background/80 backdrop-blur-xl md:flex sticky top-0 z-40 transition-all duration-300">
      <div className="flex h-14 items-center border-b border-border/40 px-6">
        <Link href="/" className="flex items-center gap-2 font-medium">
          <div className="h-6 w-6 rounded bg-accent text-accent-foreground flex items-center justify-center font-medium text-xs">
            A
          </div>
          <span>Acrue</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="flex flex-col gap-1 px-4 text-sm font-medium">
          {filteredNavItems.map((item) => {
            const hasSub = item.subItems && item.subItems.length > 0
            const isExpanded = expanded[item.id]
            const isActive = pathname === item.href || (hasSub && pathname.startsWith(item.href))
            
            return (
              <div key={item.href} className="flex flex-col gap-1">
                <div 
                  className={cn(
                    "flex items-center justify-between rounded-md px-3 py-2 transition-all",
                    isActive 
                      ? "bg-primary text-primary-foreground font-medium" 
                      : "text-muted-foreground hover:text-primary hover:bg-muted/50"
                  )}
                >
                  <Link href={item.href} className="flex items-center gap-3 flex-1">
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                  {hasSub && (
                    <button 
                      onClick={(e) => toggleExpand(item.id, e)}
                      className={cn(
                        "p-1 rounded-sm transition-colors",
                         isActive ? "hover:bg-primary-foreground/20" : "hover:bg-muted/80"
                      )}
                    >
                      <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isExpanded ? "rotate-180" : "")} />
                    </button>
                  )}
                </div>
                
                {hasSub && (
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-col gap-1 pr-1 py-1">
                          {item.subItems!.map((sub) => {
                            const isActiveSub = pathname === sub.href
                            return (
                              <Link
                                key={sub.name}
                                href={sub.href}
                                prefetch={true}
                                className={cn(
                                  "flex items-center gap-3 rounded-md pl-8 pr-2 py-1.5 text-xs transition-all",
                                  isActiveSub 
                                    ? "text-accent font-medium bg-accent/10" 
                                    : "text-muted-foreground hover:text-primary hover:bg-muted/50"
                                )}
                              >
                                <sub.icon className="h-3.5 w-3.5" />
                                {sub.name}
                              </Link>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>
            )
          })}
        </nav>
      </div>
      <div className="border-t border-border/40 p-4 flex flex-col gap-4">
        <Link 
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-muted-foreground transition-all hover:text-primary text-sm font-medium",
            pathname === "/settings" ? "bg-accent text-accent-foreground" : ""
          )}
        >
          <Settings className="h-4 w-4" />
          Ajustes
        </Link>
        <div className="flex items-center justify-between px-3">
          <span className="text-sm text-muted-foreground font-medium">Tema</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}
