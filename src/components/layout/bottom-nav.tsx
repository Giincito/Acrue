"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import type { LucideIcon } from "lucide-react"
import {
  Activity,
  BookOpen,
  Brain,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Command,
  FolderKanban,
  Gift,
  Home,
  MoreHorizontal,
  Package,
  RotateCcw,
  Settings,
  Timer,
  UtensilsCrossed,
  Wallet,
} from "lucide-react"
import {
  MODULE_VISIBILITY_EVENT,
  MODULE_VISIBILITY_STORAGE_KEY,
  normalizeModuleVisibility,
  type ModuleKey,
} from "@/lib/module-preferences"
import { IntentPrefetchLink } from "@/components/layout/intent-prefetch-link"
import { cn } from "@/lib/utils"

type MobileModuleId =
  | "inicio"
  | "calendario"
  | "tareas"
  | "proyectos"
  | "foco"
  | "estudio"
  | "cerebro"
  | "finanzas"
  | "despensa"
  | "recetas"
  | "habitos"
  | "wishlist"
  | "configuracion"

type MobileNavItem = {
  id: MobileModuleId
  moduleKey?: ModuleKey
  name: string
  href: string
  icon: LucideIcon
  canFeature?: boolean
}

const MOBILE_HOME_ITEM: MobileNavItem = { id: "inicio", name: "Inicio", href: "/", icon: Home }

const MOBILE_MODULE_ITEMS: MobileNavItem[] = [
  MOBILE_HOME_ITEM,
  { id: "calendario", moduleKey: "calendario", name: "Calendario", href: "/calendario", icon: Calendar, canFeature: true },
  { id: "tareas", moduleKey: "tareas", name: "Tareas", href: "/tareas", icon: CheckCircle2, canFeature: true },
  { id: "proyectos", moduleKey: "proyectos", name: "Proyectos", href: "/tareas/proyectos", icon: FolderKanban, canFeature: true },
  { id: "foco", name: "Foco", href: "/foco", icon: Timer, canFeature: true },
  { id: "estudio", moduleKey: "estudio", name: "Estudio", href: "/estudio", icon: BookOpen, canFeature: true },
  { id: "cerebro", moduleKey: "cerebro", name: "Cerebro", href: "/cerebro", icon: Brain, canFeature: true },
  { id: "finanzas", moduleKey: "finanzas", name: "Finanzas", href: "/finanzas", icon: Wallet, canFeature: true },
  { id: "despensa", moduleKey: "despensa", name: "Despensa", href: "/despensa", icon: Package, canFeature: true },
  { id: "recetas", moduleKey: "recetas", name: "Recetas", href: "/recetas", icon: UtensilsCrossed, canFeature: true },
  { id: "habitos", moduleKey: "habitos", name: "Hábitos", href: "/habitos", icon: Activity, canFeature: true },
  { id: "wishlist", moduleKey: "wishlist", name: "Deseos", href: "/wishlist", icon: Gift, canFeature: true },
  { id: "configuracion", name: "Ajustes", href: "/configuracion", icon: Settings },
]

const MOBILE_MODULE_GROUPS = [
  { name: "General", ids: ["inicio", "calendario"] },
  { name: "Productividad", ids: ["tareas", "proyectos", "foco"] },
  { name: "Educación", ids: ["estudio", "cerebro"] },
  { name: "Vida", ids: ["finanzas", "despensa", "recetas", "habitos", "wishlist"] },
  { name: "Sistema", ids: ["configuracion"] },
] satisfies Array<{ name: string; ids: MobileModuleId[] }>

const MOBILE_FEATURED_STORAGE_KEY = "acrue_mobile_featured_modules"
const MOBILE_MODULE_ORDER_STORAGE_KEY = "acrue_mobile_module_order"
const MOBILE_NAVIGATION_EVENT = "acrue_mobile_navigation_changed"
const DEFAULT_MOBILE_FEATURED_MODULE_IDS = ["tareas", "finanzas"] satisfies MobileModuleId[]
const DEFAULT_MOBILE_MODULE_ORDER = MOBILE_MODULE_ITEMS.map((item) => item.id)

type BottomNavProps = {
  initialMoreOpen?: boolean
  initialCustomizeOpen?: boolean
}

function isItemActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

function readStoredStringArray(key: string) {
  try {
    const value = localStorage.getItem(key)
    if (!value) return null

    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : null
  } catch {
    localStorage.removeItem(key)
    return null
  }
}

function readStoredModuleVisibility() {
  try {
    const saved = localStorage.getItem(MODULE_VISIBILITY_STORAGE_KEY)
    return normalizeModuleVisibility(saved ? JSON.parse(saved) : null)
  } catch {
    localStorage.removeItem(MODULE_VISIBILITY_STORAGE_KEY)
    return normalizeModuleVisibility(null)
  }
}

function sanitizeModuleOrder(storedOrder: string[] | null) {
  const knownIds = new Set<MobileModuleId>(MOBILE_MODULE_ITEMS.map((item) => item.id))
  const nextOrder: MobileModuleId[] = []

  for (const id of storedOrder ?? []) {
    if (knownIds.has(id as MobileModuleId) && !nextOrder.includes(id as MobileModuleId)) {
      nextOrder.push(id as MobileModuleId)
    }
  }

  for (const id of DEFAULT_MOBILE_MODULE_ORDER) {
    if (!nextOrder.includes(id)) nextOrder.push(id)
  }

  return nextOrder
}

function isFeatureCandidate(item: MobileNavItem) {
  return item.canFeature === true
}

function sanitizeFeaturedIds(storedIds: string[] | null) {
  const candidateIds = new Set(
    MOBILE_MODULE_ITEMS
      .filter(isFeatureCandidate)
      .map((item) => item.id)
  )
  const nextIds: MobileModuleId[] = []

  for (const id of storedIds ?? []) {
    if (candidateIds.has(id as MobileModuleId) && !nextIds.includes(id as MobileModuleId)) {
      nextIds.push(id as MobileModuleId)
    }
  }

  for (const id of DEFAULT_MOBILE_FEATURED_MODULE_IDS) {
    if (!nextIds.includes(id)) nextIds.push(id)
  }

  return nextIds.slice(0, 2) as [MobileModuleId, MobileModuleId]
}

function isItemVisible(item: MobileNavItem, activeModules: Record<ModuleKey, boolean>) {
  return item.moduleKey ? activeModules[item.moduleKey] : true
}

function resolveFeaturedItems(featuredIds: [MobileModuleId, MobileModuleId], candidates: MobileNavItem[]) {
  const candidateById = new Map(candidates.map((item) => [item.id, item]))
  const allFeatureItems = MOBILE_MODULE_ITEMS.filter(isFeatureCandidate)
  const resolvedItems = featuredIds
    .map((id) => candidateById.get(id))
    .filter((item): item is MobileNavItem => Boolean(item))

  for (const id of DEFAULT_MOBILE_FEATURED_MODULE_IDS) {
    const item = candidateById.get(id)
    if (item && !resolvedItems.some((resolved) => resolved.id === item.id)) resolvedItems.push(item)
  }

  for (const item of candidates) {
    if (!resolvedItems.some((resolved) => resolved.id === item.id)) resolvedItems.push(item)
  }

  for (const item of allFeatureItems) {
    if (!resolvedItems.some((resolved) => resolved.id === item.id)) resolvedItems.push(item)
  }

  return [resolvedItems[0], resolvedItems[1]] as [MobileNavItem, MobileNavItem]
}

function MobileNavIcon({
  icon: Icon,
  isActive,
}: {
  icon: LucideIcon
  isActive: boolean
}) {
  return (
    <span
      className={cn(
        "relative flex h-8 w-10 items-center justify-center rounded-lg transition-[background-color,color,box-shadow,transform] duration-150 ease-out motion-reduce:transition-none",
        isActive
          ? "bg-accent/10 text-accent ring-1 ring-accent/25 shadow-sm"
          : "text-muted-foreground"
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "h-[18px] w-[18px] transition-[stroke-width,transform] duration-150 ease-out motion-reduce:transition-none",
          isActive ? "stroke-[1.9]" : "stroke-[1.5]"
        )}
      />
      {isActive && (
        <span className="absolute -bottom-1 h-0.5 w-3 rounded-full bg-accent" aria-hidden="true" />
      )}
    </span>
  )
}

function MobileNavLink({
  item,
  isActive,
  featuredSlot,
}: {
  item: MobileNavItem
  isActive: boolean
  featuredSlot?: "left" | "right"
}) {
  return (
    <IntentPrefetchLink
      href={item.href}
      prefetch={false}
      aria-label={`Ir a ${item.name}`}
      aria-current={isActive ? "page" : undefined}
      data-active={isActive ? "true" : undefined}
      data-featured-slot={featuredSlot}
      className={cn(
        "flex h-full min-w-0 cursor-pointer flex-col items-center justify-center gap-1.5 px-1 pt-1 pb-2 text-muted-foreground transition-colors duration-150 ease-out motion-reduce:transition-none",
        isActive ? "text-accent" : "hover:text-foreground"
      )}
    >
      <MobileNavIcon icon={item.icon} isActive={isActive} />
      <span className={cn("max-w-full truncate text-[10px] font-medium leading-none", isActive && "text-foreground")}>
        {item.name}
      </span>
    </IntentPrefetchLink>
  )
}

export function BottomNav({ initialMoreOpen = false, initialCustomizeOpen = false }: BottomNavProps) {
  const pathname = usePathname()
  const [isMoreOpen, setIsMoreOpen] = React.useState(initialMoreOpen)
  const [isCustomizeOpen, setIsCustomizeOpen] = React.useState(initialCustomizeOpen)
  const [activeModules, setActiveModules] = React.useState<Record<ModuleKey, boolean>>(normalizeModuleVisibility(null))
  const [moduleOrder, setModuleOrder] = React.useState<MobileModuleId[]>(DEFAULT_MOBILE_MODULE_ORDER)
  const [featuredIds, setFeaturedIds] = React.useState<[MobileModuleId, MobileModuleId]>(
    sanitizeFeaturedIds(DEFAULT_MOBILE_FEATURED_MODULE_IDS)
  )
  const shouldReduceMotion = useReducedMotion()

  React.useEffect(() => {
    const syncMobileNavigation = () => {
      setActiveModules(readStoredModuleVisibility())
      setModuleOrder(sanitizeModuleOrder(readStoredStringArray(MOBILE_MODULE_ORDER_STORAGE_KEY)))
      setFeaturedIds(sanitizeFeaturedIds(readStoredStringArray(MOBILE_FEATURED_STORAGE_KEY)))
    }

    syncMobileNavigation()

    window.addEventListener("storage", syncMobileNavigation)
    window.addEventListener(MODULE_VISIBILITY_EVENT, syncMobileNavigation)
    window.addEventListener(MOBILE_NAVIGATION_EVENT, syncMobileNavigation)

    return () => {
      window.removeEventListener("storage", syncMobileNavigation)
      window.removeEventListener(MODULE_VISIBILITY_EVENT, syncMobileNavigation)
      window.removeEventListener(MOBILE_NAVIGATION_EVENT, syncMobileNavigation)
    }
  }, [])

  const orderedItems = React.useMemo(() => {
    const itemById = new Map(MOBILE_MODULE_ITEMS.map((item) => [item.id, item]))

    return moduleOrder
      .map((id) => itemById.get(id))
      .filter((item): item is MobileNavItem => Boolean(item))
      .filter((item) => isItemVisible(item, activeModules))
  }, [activeModules, moduleOrder])
  const groupedOrderedItems = React.useMemo(() => {
    const itemById = new Map(orderedItems.map((item) => [item.id, item]))

    return MOBILE_MODULE_GROUPS
      .map((group) => ({
        ...group,
        items: group.ids
          .map((id) => itemById.get(id))
          .filter((item): item is MobileNavItem => Boolean(item)),
      }))
      .filter((group) => group.items.length > 0)
  }, [orderedItems])
  const featureCandidates = React.useMemo(() => orderedItems.filter(isFeatureCandidate), [orderedItems])
  const [leftFeaturedItem, rightFeaturedItem] = resolveFeaturedItems(featuredIds, featureCandidates)
  const isMoreActive = ![MOBILE_HOME_ITEM, leftFeaturedItem, rightFeaturedItem].some((item) =>
    isItemActive(pathname, item.href)
  )

  const emitMobileNavigationChange = () => {
    window.dispatchEvent(new Event(MOBILE_NAVIGATION_EVENT))
  }

  const openCommandMenu = () => {
    window.dispatchEvent(new CustomEvent("acrue:open-cmdk"))
  }

  const closeMore = () => setIsMoreOpen(false)

  const saveFeaturedIds = (nextIds: [MobileModuleId, MobileModuleId]) => {
    const sanitizedIds = sanitizeFeaturedIds(nextIds)
    setFeaturedIds(sanitizedIds)
    localStorage.setItem(MOBILE_FEATURED_STORAGE_KEY, JSON.stringify(sanitizedIds))
    emitMobileNavigationChange()
  }

  const updateFeaturedSlot = (slot: "left" | "right", value: MobileModuleId) => {
    const nextIds: [MobileModuleId, MobileModuleId] = [...featuredIds]
    const slotIndex = slot === "left" ? 0 : 1
    const otherIndex = slotIndex === 0 ? 1 : 0

    if (nextIds[otherIndex] === value) {
      nextIds[otherIndex] = nextIds[slotIndex]
    }

    nextIds[slotIndex] = value
    saveFeaturedIds(nextIds)
  }

  const saveModuleOrder = (nextOrder: MobileModuleId[]) => {
    const sanitizedOrder = sanitizeModuleOrder(nextOrder)
    setModuleOrder(sanitizedOrder)
    localStorage.setItem(MOBILE_MODULE_ORDER_STORAGE_KEY, JSON.stringify(sanitizedOrder))
    emitMobileNavigationChange()
  }

  const moveModule = (id: MobileModuleId, direction: -1 | 1) => {
    const currentIndex = moduleOrder.indexOf(id)
    const nextIndex = currentIndex + direction
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= moduleOrder.length) return

    const nextOrder = [...moduleOrder]
    const [item] = nextOrder.splice(currentIndex, 1)
    nextOrder.splice(nextIndex, 0, item)
    saveModuleOrder(nextOrder)
  }

  const resetMobileNavigation = () => {
    saveFeaturedIds(sanitizeFeaturedIds(DEFAULT_MOBILE_FEATURED_MODULE_IDS))
    saveModuleOrder(DEFAULT_MOBILE_MODULE_ORDER)
  }

  return (
    <>
      <nav
        aria-label="Navegación móvil"
        className="fixed inset-x-0 bottom-0 z-50 grid h-[72px] w-full min-w-0 grid-cols-5 items-center overflow-x-hidden border-t bg-background/90 pb-safe backdrop-blur-md md:hidden"
      >
        <MobileNavLink item={MOBILE_HOME_ITEM} isActive={isItemActive(pathname, MOBILE_HOME_ITEM.href)} />
        <MobileNavLink
          item={leftFeaturedItem}
          isActive={isItemActive(pathname, leftFeaturedItem.href)}
          featuredSlot="left"
        />
        <button
          type="button"
          aria-label="Abrir comando global"
          data-command-trigger="true"
          onClick={openCommandMenu}
          className="mx-auto flex size-12 -translate-y-2 cursor-pointer items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-transform duration-150 ease-out hover:scale-[1.03] active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100"
        >
          <Command className="h-5 w-5 stroke-[1.6]" aria-hidden="true" />
        </button>
        <MobileNavLink
          item={rightFeaturedItem}
          isActive={isItemActive(pathname, rightFeaturedItem.href)}
          featuredSlot="right"
        />
        <button
          type="button"
          aria-label={isMoreOpen ? "Cerrar módulos" : "Abrir módulos"}
          aria-controls="mobile-module-nav"
          aria-expanded={isMoreOpen}
          data-active={isMoreActive ? "true" : undefined}
          onClick={() => setIsMoreOpen((open) => !open)}
          className={cn(
            "flex h-full min-w-0 cursor-pointer flex-col items-center justify-center gap-1.5 px-1 pt-1 pb-2 text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground motion-reduce:transition-none",
            isMoreActive && "text-accent"
          )}
        >
          <MobileNavIcon icon={MoreHorizontal} isActive={isMoreActive} />
          <span className={cn("max-w-full truncate text-[10px] font-medium leading-none", isMoreActive && "text-foreground")}>
            Más
          </span>
        </button>
      </nav>

      <AnimatePresence initial={false}>
        {isMoreOpen && (
          <div className="md:hidden">
            <motion.button
              type="button"
              aria-label="Cerrar módulos"
              className="fixed inset-0 z-[55] cursor-pointer bg-black/50 backdrop-blur-xs"
              onClick={closeMore}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: shouldReduceMotion ? 0.1 : 0.16, ease: "easeOut" }}
            />
            <motion.div
              id="mobile-module-nav"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-module-nav-title"
              className="fixed inset-x-0 bottom-0 z-[60] max-h-[min(82dvh,620px)] overflow-x-hidden overflow-y-auto rounded-t-xl border-t bg-background px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 shadow-lg"
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(16px)" }}
              animate={{ opacity: 1, transform: "translateY(0)" }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(16px)" }}
              transition={{ duration: shouldReduceMotion ? 0.1 : 0.2, ease: [0.23, 1, 0.32, 1] }}
            >
              <div className="mx-auto flex w-full max-w-md flex-col gap-5 overflow-x-hidden">
                <div className="flex items-center justify-between gap-3">
                  <h2 id="mobile-module-nav-title" className="min-w-0 text-base font-medium text-foreground">
                    {isCustomizeOpen ? "Personalizar" : "Módulos"}
                  </h2>
                  <button
                    type="button"
                    aria-label={isCustomizeOpen ? "Volver a módulos" : "Personalizar módulos"}
                    onClick={() => setIsCustomizeOpen((open) => !open)}
                    className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>

                {isCustomizeOpen ? (
                  <div className="space-y-5 overflow-x-hidden">
                    <section className="space-y-2">
                      <h3 className="px-1 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                        Destacados
                      </h3>
                      <div className="grid gap-2">
                        <label className="grid gap-1 text-sm">
                          <span className="text-xs font-medium text-muted-foreground">Izquierda</span>
                          <select
                            name="featured-left"
                            value={leftFeaturedItem.id}
                            onChange={(event) => updateFeaturedSlot("left", event.target.value as MobileModuleId)}
                            className="w-full cursor-pointer rounded-lg border bg-card px-3 py-2 text-foreground"
                          >
                            {featureCandidates.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="grid gap-1 text-sm">
                          <span className="text-xs font-medium text-muted-foreground">Derecha</span>
                          <select
                            name="featured-right"
                            value={rightFeaturedItem.id}
                            onChange={(event) => updateFeaturedSlot("right", event.target.value as MobileModuleId)}
                            className="w-full cursor-pointer rounded-lg border bg-card px-3 py-2 text-foreground"
                          >
                            {featureCandidates.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </section>

                    <section className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="px-1 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                          Orden
                        </h3>
                        <button
                          type="button"
                          aria-label="Restablecer navegación móvil"
                          onClick={resetMobileNavigation}
                          className="inline-flex min-h-11 min-w-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <RotateCcw className="h-4 w-4" aria-hidden="true" />
                          <span>Restablecer</span>
                        </button>
                      </div>
                      <div className="space-y-2 overflow-x-hidden">
                        {orderedItems.map((item, index) => (
                          <div
                            key={item.id}
                            className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg border bg-card px-3 py-2"
                          >
                            <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                              {item.name}
                            </span>
                            <button
                              type="button"
                              aria-label={`Subir ${item.name}`}
                              disabled={index === 0}
                              onClick={() => moveModule(item.id, -1)}
                              className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <ChevronUp className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Bajar ${item.name}`}
                              disabled={index === orderedItems.length - 1}
                              onClick={() => moveModule(item.id, 1)}
                              className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <ChevronDown className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                ) : (
                  <div className="space-y-4 overflow-x-hidden">
                    {groupedOrderedItems.map((group) => (
                      <section key={group.name} className="space-y-2 overflow-x-hidden">
                        <h3 className="px-1 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                          {group.name}
                        </h3>
                        <div className="grid grid-cols-2 gap-2 overflow-x-hidden">
                          {group.items.map((item) => {
                            const isActive = isItemActive(pathname, item.href)

                            return (
                              <IntentPrefetchLink
                                key={item.href}
                                href={item.href}
                                prefetch={false}
                                aria-label={`Ir a ${item.name}`}
                                aria-current={isActive ? "page" : undefined}
                                onClick={closeMore}
                                className={cn(
                                  "flex min-h-11 min-w-0 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm font-medium transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100",
                                  isActive
                                    ? "border-accent/25 bg-accent/10 text-accent"
                                    : "border-border/70 bg-card text-foreground hover:bg-muted/50"
                                )}
                              >
                                <item.icon className="h-4 w-4 shrink-0 stroke-[1.5]" aria-hidden="true" />
                                <span className="min-w-0 truncate">{item.name}</span>
                              </IntentPrefetchLink>
                            )
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
