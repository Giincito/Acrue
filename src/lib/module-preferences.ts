export const MODULE_VISIBILITY_STORAGE_KEY = "acrue_modules"
export const MODULE_VISIBILITY_EVENT = "acrue_modules_changed"

export const MODULE_VISIBILITY_DEFAULTS = {
  tareas: true,
  calendario: true,
  proyectos: true,
  estudio: true,
  finanzas: true,
  despensa: true,
  recetas: true,
  habitos: true,
  cerebro: true,
  wishlist: true,
} as const

export type ModuleKey = keyof typeof MODULE_VISIBILITY_DEFAULTS

export const MODULE_LABELS: Record<ModuleKey, string> = {
  tareas: "Tareas",
  calendario: "Calendario",
  proyectos: "Proyectos",
  estudio: "Estudio",
  finanzas: "Finanzas",
  despensa: "Despensa",
  recetas: "Recetas",
  habitos: "Hábitos",
  cerebro: "Cerebro",
  wishlist: "Lista de deseos",
}

export function normalizeModuleVisibility(
  storedModules: Partial<Record<ModuleKey, boolean>> | null
): Record<ModuleKey, boolean> {
  const nextModules: Record<ModuleKey, boolean> = { ...MODULE_VISIBILITY_DEFAULTS }

  if (!storedModules) return nextModules

  for (const key of Object.keys(nextModules) as ModuleKey[]) {
    if (typeof storedModules[key] === "boolean") {
      nextModules[key] = storedModules[key]
    }
  }

  return nextModules
}
