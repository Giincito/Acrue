"use client"

import * as React from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { IntentPrefetchLink } from "@/components/layout/intent-prefetch-link"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { BrandMark } from "@/components/ui/brand-mark"
import { trpc } from "@/lib/trpc"
import {
  MODULE_VISIBILITY_EVENT,
  MODULE_VISIBILITY_STORAGE_KEY,
  normalizeModuleVisibility,
} from "@/lib/module-preferences"
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
  ListTodo,
  TrendingUp,
  LayoutGrid,
  Columns,
  Square,
  List,
  LayoutDashboard,
  BarChart3,
  Receipt,
  RefreshCw,
  Target,
  Handshake,
  Package,
  Scale,
  ChefHat,
  Lightbulb,
  Flame,
  CalendarDays,
  Trophy,
  Timer,
  BookOpenCheck,
  Home,
} from "lucide-react"

type NavLeaf = {
  name: string
  href: string
  icon: LucideIcon
}

type NavSubItem = NavLeaf | {
  name: string
  icon: LucideIcon
  children: NavLeaf[]
}

type NavItem = {
  id: string
  name: string
  href: string
  icon: LucideIcon
  subItems?: NavSubItem[]
}

const NAV_ITEMS = [
  {
    id: "inicio",
    name: "Inicio",
    href: "/",
    icon: Home,
  },
  {
    id: "tareas",
    name: "Tareas",
    href: "/tareas",
    icon: CheckCircle2,
    subItems: [
      {
        name: "Vistas",
        icon: ListTodo,
        children: [
          { name: "Bandeja", href: "/tareas", icon: ListTodo },
          { name: "Hoy", href: "/tareas?tab=today", icon: CalendarDays },
          { name: "Próximas", href: "/tareas?tab=upcoming", icon: Calendar },
          { name: "Terminadas", href: "/tareas?tab=completed", icon: CheckCircle2 },
        ],
      },
      { name: "Proyectos", href: "/tareas/proyectos", icon: FolderKanban },
      { name: "Etiquetas", href: "/tareas/etiquetas", icon: Tags },
      { name: "Prioridades", href: "/tareas/prioridades", icon: Flag },
      { name: "Papelera", href: "/tareas/papelera", icon: Trash2 },
    ]
  },
  {
    id: "calendario",
    name: "Calendario",
    href: "/calendario",
    icon: Calendar,
    subItems: [
      { name: "Mensual", href: "/calendario?view=month", icon: LayoutGrid },
      { name: "Semanal", href: "/calendario?view=week", icon: Columns },
      { name: "Diario", href: "/calendario?view=day", icon: Square },
      { name: "Agenda", href: "/calendario?view=agenda", icon: List },
    ]
  },
  {
    id: "estudio",
    name: "Estudio",
    href: "/estudio",
    icon: BookOpen,
    subItems: [
      { name: "Materias", href: "/estudio", icon: BookOpen },
      { name: "Promedio", href: "/estudio?tab=promedio", icon: TrendingUp },
      { name: "Horarios", href: "/estudio?tab=horarios", icon: Calendar },
      { name: "Campus Moodle", href: "/estudio?tab=campus", icon: Activity },
    ]
  },
  {
    id: "finanzas",
    name: "Finanzas",
    href: "/finanzas",
    icon: Wallet,
    subItems: [
      { name: "Panel", href: "/finanzas", icon: LayoutDashboard },
      { name: "Gastos", href: "/finanzas?tab=gastos", icon: Receipt },
      { name: "Deudas", href: "/finanzas?tab=deudas", icon: Handshake },
      { name: "Suscripciones", href: "/finanzas?tab=suscripciones", icon: RefreshCw },
      { name: "Metas", href: "/finanzas?tab=metas", icon: Target },
    ]
  },
  {
    id: "despensa",
    name: "Despensa",
    href: "/despensa",
    icon: ShoppingCart,
    subItems: [
      { name: "Inventario", href: "/despensa", icon: Package },
      { name: "Compras", href: "/despensa?tab=compras", icon: ShoppingCart },
      { name: "Comparador", href: "/despensa?tab=comparador", icon: Scale },
    ]
  },
  {
    id: "recetas",
    name: "Recetas",
    href: "/recetas",
    icon: UtensilsCrossed,
    subItems: [
      { name: "Recetas", href: "/recetas", icon: ChefHat },
      { name: "Sugeridor", href: "/recetas?tab=sugeridor", icon: Lightbulb },
      { name: "Tracker", href: "/recetas?tab=tracker", icon: Flame },
      { name: "Plan semanal", href: "/recetas?tab=plan", icon: CalendarDays },
    ]
  },
  {
    id: "habitos",
    name: "Hábitos",
    href: "/habitos",
    icon: Activity,
    subItems: [
      { name: "Hoy", href: "/habitos?view=today", icon: Activity },
      { name: "Semana", href: "/habitos?view=week", icon: CalendarDays },
      { name: "Mes", href: "/habitos?view=month", icon: Calendar },
      { name: "Año", href: "/habitos?view=year", icon: BarChart3 },
      { name: "XP", href: "/habitos?view=xp", icon: Trophy },
    ]
  },
  {
    id: "cerebro",
    name: "Cerebro",
    href: "/cerebro",
    icon: Brain,
    subItems: [
      { name: "Foco", href: "/cerebro", icon: Timer },
      { name: "Repaso", href: "/cerebro?tab=repaso", icon: Target },
      { name: "Apuntes", href: "/cerebro?tab=apuntes", icon: BookOpenCheck },
    ]
  },
  { id: "wishlist", name: "Deseos", href: "/wishlist", icon: Gift },
] satisfies NavItem[]

type SearchParamsReader = Pick<URLSearchParams, "get">

function isLeafSubItem(item: NavSubItem): item is NavLeaf {
  return "href" in item
}

function isHrefActive(href: string, pathname: string, searchParams: SearchParamsReader) {
  const [hrefPath, hrefQuery] = href.split("?")
  if (pathname !== hrefPath) return false

  if (hrefQuery) {
    const hrefParams = new URLSearchParams(hrefQuery)
    return Array.from(hrefParams.entries()).every(([key, value]) => searchParams.get(key) === value)
  }

  if (href === "/estudio" && searchParams.get("tab") === "materias") {
    return true
  }

  return !searchParams.get("tab") && !searchParams.get("view")
}

function hasActiveChild(children: NavLeaf[], pathname: string, searchParams: SearchParamsReader) {
  return children.some((child) => isHrefActive(child.href, pathname, searchParams))
}

export function Sidebar() {
  const pathname = usePathname()
  const { data: xpSummary } = trpc.xp.summary.useQuery()
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({
    tareas: true,
    estudio: true
  })
  const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>({})
  const searchParams = useSearchParams()

  const [activeModules, setActiveModules] = React.useState<Record<string, boolean>>(normalizeModuleVisibility(null))

  React.useEffect(() => {
    const loadModules = () => {
      try {
        const saved = localStorage.getItem(MODULE_VISIBILITY_STORAGE_KEY)
        setActiveModules(normalizeModuleVisibility(saved ? JSON.parse(saved) : null))
      } catch {
        localStorage.removeItem(MODULE_VISIBILITY_STORAGE_KEY)
        setActiveModules(normalizeModuleVisibility(null))
      }
    }
    loadModules()
    window.addEventListener(MODULE_VISIBILITY_EVENT, loadModules)
    return () => window.removeEventListener(MODULE_VISIBILITY_EVENT, loadModules)
  }, [])

  // Auto-collapse logic when changing modules
  React.useEffect(() => {
    const activeItem = NAV_ITEMS.find(item =>
      pathname === item.href || (item.subItems && (pathname === item.href || pathname.startsWith(item.href + "/")))
    )

    if (activeItem && activeItem.subItems) {
      setExpanded({ [activeItem.id]: true })
    } else {
      setExpanded({})
    }
  }, [pathname])

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

  const toggleGroupExpand = (id: string) => {
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <aside className="hidden h-screen w-56 flex-col border-r border-border/40 bg-background/80 backdrop-blur-xl md:flex sticky top-0 z-40 transition-[background-color,border-color] duration-200 ease-out motion-reduce:transition-none">
      <div className="flex h-16 items-center justify-center border-b border-border/40 px-4">
        <BrandMark href="/" size="md" />
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar py-3">
        <nav className="flex flex-col gap-0.5 px-3 text-[13px] font-medium">
          {filteredNavItems.map((item) => {
            const hasSub = item.subItems && item.subItems.length > 0
            const isExpanded = expanded[item.id]
            const isActive = pathname === item.href || (hasSub && pathname.startsWith(item.href))

            return (
              <div key={item.href} className="flex flex-col gap-1">
                <div
                  className={cn(
                    "relative flex min-h-11 items-center justify-between rounded-md px-2.5 transition-[background-color,color,box-shadow] duration-150 ease-out motion-reduce:transition-none",
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:text-primary hover:bg-muted/50"
                  )}
                >
                  <IntentPrefetchLink
                    href={item.href}
                    prefetch={false}
                    aria-label={`Ir a ${item.name}`}
                    className="absolute inset-0 rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                  <div className="pointer-events-none flex items-center gap-2.5 flex-1">
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </div>
                  {hasSub && (
                    <button
                      type="button"
                      onClick={(e) => toggleExpand(item.id, e)}
                      aria-label={`${isExpanded ? "Contraer" : "Expandir"} ${item.name}`}
                      aria-expanded={isExpanded}
                      className={cn(
                        "relative z-10 flex min-h-11 min-w-11 items-center justify-center rounded-sm transition-colors",
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
                        <div className="flex flex-col gap-0.5 pr-1 py-1">
                          {item.subItems!.map((sub) => {
                            if (!isLeafSubItem(sub)) {
                              const groupId = `${item.id}:${sub.name}`
                              const isActiveGroup = hasActiveChild(sub.children, pathname, searchParams)
                              const isExpandedGroup = isActiveGroup || expandedGroups[groupId]

                              return (
                                <div key={groupId} className="flex flex-col gap-0.5">
                                  <button
                                    type="button"
                                    aria-expanded={isExpandedGroup}
                                    aria-label={`${isExpandedGroup ? "Contraer" : "Expandir"} ${sub.name}`}
                                    onClick={() => toggleGroupExpand(groupId)}
                                    className={cn(
                                      "flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-md pl-7 pr-2 py-1 text-left text-xs transition-[background-color,color] duration-150 ease-out motion-reduce:transition-none",
                                      isActiveGroup
                                        ? "text-accent font-medium"
                                        : "text-muted-foreground hover:text-primary hover:bg-muted/50"
                                    )}
                                  >
                                    <sub.icon className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span className="min-w-0 flex-1 truncate">{sub.name}</span>
                                    <ChevronDown
                                      className={cn(
                                        "h-3.5 w-3.5 transition-transform duration-200",
                                        isExpandedGroup ? "rotate-180" : ""
                                      )}
                                      aria-hidden="true"
                                    />
                                  </button>

                                  <AnimatePresence initial={false}>
                                    {isExpandedGroup && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.18, ease: "easeInOut" }}
                                        className="overflow-hidden"
                                      >
                                        <div className="flex flex-col gap-0.5">
                                          {sub.children.map((child) => {
                                            const isActiveChild = isHrefActive(child.href, pathname, searchParams)

                                            return (
                                              <IntentPrefetchLink
                                                key={child.name}
                                                href={child.href}
                                                prefetch={false}
                                                className={cn(
                                                  "flex min-h-8 items-center gap-2 rounded-md pl-11 pr-2 py-1 text-xs transition-[background-color,color] duration-150 ease-out motion-reduce:transition-none cursor-pointer",
                                                  isActiveChild
                                                    ? "text-accent font-medium bg-accent/10"
                                                    : "text-muted-foreground hover:text-primary hover:bg-muted/50"
                                                )}
                                              >
                                                <child.icon className="h-3.5 w-3.5" aria-hidden="true" />
                                                {child.name}
                                              </IntentPrefetchLink>
                                            )
                                          })}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              )
                            }

                            const isActiveSub = isHrefActive(sub.href, pathname, searchParams)
                            return (
                              <IntentPrefetchLink
                                key={sub.name}
                                href={sub.href}
                                prefetch={false}
                                className={cn(
                                  "flex min-h-9 items-center gap-2 rounded-md pl-7 pr-2 py-1 text-xs transition-[background-color,color] duration-150 ease-out motion-reduce:transition-none cursor-pointer",
                                  isActiveSub
                                    ? "text-accent font-medium bg-accent/10"
                                    : "text-muted-foreground hover:text-primary hover:bg-muted/50"
                                )}
                              >
                                <sub.icon className="h-3.5 w-3.5" />
                                {sub.name}
                              </IntentPrefetchLink>
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
      <div className="border-t border-border/40 p-3 flex flex-col gap-3">
        {xpSummary && (
          <IntentPrefetchLink
            href="/habitos"
            prefetch={false}
            className="flex cursor-pointer flex-col gap-2 rounded-md border border-border/60 bg-card px-3 py-2 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">XP</span>
              <span className="text-xs font-medium text-foreground">Nivel {xpSummary.level}</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out motion-reduce:transition-none"
                style={{ width: `${xpSummary.progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between gap-2 text-xs tabular-nums text-muted-foreground">
              <span>{xpSummary.totalXP} XP</span>
              <span>{xpSummary.title}</span>
            </div>
          </IntentPrefetchLink>
        )}
        <IntentPrefetchLink
          href="/configuracion"
          prefetch={false}
          className={cn(
            "flex min-h-11 items-center gap-2.5 rounded-md px-2.5 py-1.5 text-muted-foreground transition-[background-color,color] duration-150 ease-out motion-reduce:transition-none hover:text-primary text-[13px] font-medium cursor-pointer",
            pathname === "/configuracion" ? "bg-accent text-accent-foreground" : ""
          )}
        >
          <Settings className="h-4 w-4" />
          Ajustes
        </IntentPrefetchLink>
        <div className="flex items-center justify-between px-3">
          <span className="text-sm text-muted-foreground font-medium">Tema</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}
