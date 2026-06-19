"use client"

import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

type RouteTransitionMode = "fade" | "hierarchy-forward" | "hierarchy-back"

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1]
const EASE_IN: [number, number, number, number] = [0.4, 0, 1, 1]

const tabVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.15, delay: 0.05, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.1, ease: EASE_IN },
  },
}

const routeVariants = {
  fade: tabVariants,
  "hierarchy-forward": {
    initial: { opacity: 0, transform: "translateX(24px)" },
    animate: {
      opacity: 1,
      transform: "translateX(0px)",
      transition: { duration: 0.25, ease: EASE_OUT },
    },
    exit: {
      opacity: 0,
      transform: "translateX(-12px)",
      transition: { duration: 0.2, ease: EASE_IN },
    },
  },
  "hierarchy-back": {
    initial: { opacity: 0, transform: "translateX(-12px)" },
    animate: {
      opacity: 1,
      transform: "translateX(0px)",
      transition: { duration: 0.25, ease: EASE_OUT },
    },
    exit: {
      opacity: 0,
      transform: "translateX(24px)",
      transition: { duration: 0.2, ease: EASE_IN },
    },
  },
}

let lastCommittedPathname: string | null = null

function normalizePathname(pathname: string) {
  const normalized = pathname.split("?")[0]?.replace(/\/+$/, "")

  return normalized || "/"
}

function getPathSegments(pathname: string) {
  return normalizePathname(pathname).split("/").filter(Boolean)
}

export function getRouteTransitionMode(
  pathname: string,
  previousPathname: string | null
): RouteTransitionMode {
  if (!previousPathname) return "fade"

  const current = normalizePathname(pathname)
  const previous = normalizePathname(previousPathname)

  if (current === previous) return "fade"

  const currentSegments = getPathSegments(current)
  const previousSegments = getPathSegments(previous)
  const currentParent = currentSegments.slice(0, -1).join("/")
  const previousParent = previousSegments.slice(0, -1).join("/")

  if (currentParent === previousParent) return "fade"
  if (currentSegments.length > previousSegments.length) return "hierarchy-forward"
  if (currentSegments.length < previousSegments.length) return "hierarchy-back"

  return "fade"
}

export function RouteTransition({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const pathname = usePathname()
  const shouldReduceMotion = useReducedMotion()
  const mode = getRouteTransitionMode(pathname, lastCommittedPathname)

  React.useEffect(() => {
    lastCommittedPathname = pathname
  }, [pathname])

  if (shouldReduceMotion) {
    return <div className={cn("flex-1 w-full h-full", className)}>{children}</div>
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        data-route-transition={mode}
        initial={routeVariants[mode].initial}
        animate={routeVariants[mode].animate}
        exit={routeVariants[mode].exit}
        className={cn("flex-1 w-full h-full will-change-[opacity,transform]", className)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

export function TabTransition({
  children,
  className,
  value,
}: {
  children: React.ReactNode
  className?: string
  value: string
}) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={value}
        data-tab-transition="fade"
        initial={tabVariants.initial}
        animate={tabVariants.animate}
        exit={tabVariants.exit}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
