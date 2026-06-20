"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import type { LucideIcon } from "lucide-react"
import {
  Activity,
  BookOpen,
  Brain,
  Calendar,
  CheckCircle2,
  Command,
  FolderKanban,
  Gift,
  Home,
  MoreHorizontal,
  Package,
  Settings,
  Timer,
  UtensilsCrossed,
  Wallet,
} from "lucide-react"
import { cn } from "@/lib/utils"

type MobileNavItem = {
  name: string
  href: string
  icon: LucideIcon
}

const MOBILE_PRIMARY_ITEMS = [
  { name: "Inicio", href: "/", icon: Home },
  { name: "Tareas", href: "/tareas", icon: CheckCircle2 },
  { name: "Finanzas", href: "/finanzas", icon: Wallet },
] satisfies MobileNavItem[]

const MOBILE_MODULE_GROUPS = [
  {
    name: "General",
    items: [
      { name: "Inicio", href: "/", icon: Home },
      { name: "Calendario", href: "/calendario", icon: Calendar },
    ],
  },
  {
    name: "Productividad",
    items: [
      { name: "Tareas", href: "/tareas", icon: CheckCircle2 },
      { name: "Proyectos", href: "/tareas/proyectos", icon: FolderKanban },
      { name: "Foco", href: "/foco", icon: Timer },
    ],
  },
  {
    name: "Académico",
    items: [
      { name: "Estudio", href: "/estudio", icon: BookOpen },
      { name: "Cerebro", href: "/cerebro", icon: Brain },
    ],
  },
  {
    name: "Vida",
    items: [
      { name: "Finanzas", href: "/finanzas", icon: Wallet },
      { name: "Despensa", href: "/despensa", icon: Package },
      { name: "Recetas", href: "/recetas", icon: UtensilsCrossed },
      { name: "Hábitos", href: "/habitos", icon: Activity },
      { name: "Deseos", href: "/wishlist", icon: Gift },
    ],
  },
  {
    name: "Sistema",
    items: [{ name: "Ajustes", href: "/configuracion", icon: Settings }],
  },
] satisfies Array<{ name: string; items: MobileNavItem[] }>

type BottomNavProps = {
  initialMoreOpen?: boolean
}

function isItemActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
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

function MobileNavLink({ item, isActive }: { item: MobileNavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      aria-label={`Ir a ${item.name}`}
      aria-current={isActive ? "page" : undefined}
      data-active={isActive ? "true" : undefined}
      className={cn(
        "flex h-full min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 px-1 text-muted-foreground transition-colors duration-150 ease-out motion-reduce:transition-none",
        isActive ? "text-accent" : "hover:text-foreground"
      )}
    >
      <MobileNavIcon icon={item.icon} isActive={isActive} />
      <span className={cn("max-w-full truncate text-[10px] font-medium", isActive && "text-foreground")}>
        {item.name}
      </span>
    </Link>
  )
}

export function BottomNav({ initialMoreOpen = false }: BottomNavProps) {
  const pathname = usePathname()
  const [isMoreOpen, setIsMoreOpen] = React.useState(initialMoreOpen)
  const shouldReduceMotion = useReducedMotion()
  const [startItem, secondItem, thirdItem] = MOBILE_PRIMARY_ITEMS
  const isMoreActive = !MOBILE_PRIMARY_ITEMS.some((item) => isItemActive(pathname, item.href))

  const openCommandMenu = () => {
    window.dispatchEvent(new CustomEvent("acrue:open-cmdk"))
  }

  const closeMore = () => setIsMoreOpen(false)

  return (
    <>
      <nav
        aria-label="Navegación móvil"
        className="fixed inset-x-0 bottom-0 z-50 grid h-16 w-full min-w-0 grid-cols-5 items-center overflow-x-hidden border-t bg-background/90 pb-safe backdrop-blur-md md:hidden"
      >
        <MobileNavLink item={startItem} isActive={isItemActive(pathname, startItem.href)} />
        <MobileNavLink item={secondItem} isActive={isItemActive(pathname, secondItem.href)} />
        <button
          type="button"
          aria-label="Abrir comando global"
          data-command-trigger="true"
          onClick={openCommandMenu}
          className="mx-auto flex size-12 -translate-y-2 cursor-pointer items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-transform duration-150 ease-out hover:scale-[1.03] active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100"
        >
          <Command className="h-5 w-5 stroke-[1.6]" aria-hidden="true" />
        </button>
        <MobileNavLink item={thirdItem} isActive={isItemActive(pathname, thirdItem.href)} />
        <button
          type="button"
          aria-label={isMoreOpen ? "Cerrar módulos" : "Abrir módulos"}
          aria-controls="mobile-module-nav"
          aria-expanded={isMoreOpen}
          data-active={isMoreActive ? "true" : undefined}
          onClick={() => setIsMoreOpen((open) => !open)}
          className={cn(
            "flex h-full min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 px-1 text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground motion-reduce:transition-none",
            isMoreActive && "text-accent"
          )}
        >
          <MobileNavIcon icon={MoreHorizontal} isActive={isMoreActive} />
          <span className={cn("max-w-full truncate text-[10px] font-medium", isMoreActive && "text-foreground")}>
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
              className="fixed inset-x-0 bottom-0 z-[60] max-h-[min(82dvh,620px)] overflow-x-hidden overflow-y-auto rounded-t-xl border-t bg-background px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4 shadow-lg"
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(16px)" }}
              animate={{ opacity: 1, transform: "translateY(0)" }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(16px)" }}
              transition={{ duration: shouldReduceMotion ? 0.1 : 0.2, ease: [0.23, 1, 0.32, 1] }}
            >
              <div className="mx-auto flex w-full max-w-md flex-col gap-5 overflow-x-hidden">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 id="mobile-module-nav-title" className="text-base font-medium text-foreground">
                      Módulos
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">Acceso completo a Acrue.</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Cerrar módulos"
                    onClick={closeMore}
                    className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>

                <div className="space-y-4 overflow-x-hidden">
                  {MOBILE_MODULE_GROUPS.map((group) => (
                    <section key={group.name} className="space-y-2">
                      <h3 className="px-1 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                        {group.name}
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {group.items.map((item) => {
                          const isActive = isItemActive(pathname, item.href)

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
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
                            </Link>
                          )
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
