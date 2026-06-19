"use client"

import {
  ShoppingCart,
  Bus,
  Zap,
  HeartPulse,
  GraduationCap,
  Gamepad2,
  Utensils,
  Shirt,
  Smartphone,
  Home,
  MoreHorizontal,
  HelpCircle,
  Tag,
  Receipt,
} from "lucide-react"
import { cn } from "@/lib/utils"

/** Maps icon name strings to Lucide components */
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "shopping-cart": ShoppingCart,
  bus: Bus,
  zap: Zap,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  "gamepad-2": Gamepad2,
  utensils: Utensils,
  shirt: Shirt,
  smartphone: Smartphone,
  home: Home,
  "more-horizontal": MoreHorizontal,
  "help-circle": HelpCircle,
  tag: Tag,
  receipt: Receipt,
}

interface CategoryIconProps {
  name: string
  className?: string
}

/**
 * Renders a Lucide icon by string name.
 * Used throughout the finance module to display category icons dynamically.
 */
export function CategoryIcon({ name, className }: CategoryIconProps) {
  const Icon = ICON_MAP[name] ?? Tag
  return <Icon className={cn("h-4 w-4", className)} />
}
