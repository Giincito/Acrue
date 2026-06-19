export const GENERIC_COLOR_OPTIONS = [
  { name: "Rojo", value: "#dc2626" },
  { name: "Naranja", value: "#ea580c" },
  { name: "Amarillo", value: "#ca8a04" },
  { name: "Verde", value: "#16a34a" },
  { name: "Verde oscuro", value: "#166534" },
  { name: "Celeste", value: "#0ea5e9" },
  { name: "Azul", value: "#2563eb" },
  { name: "Violeta", value: "#7c3aed" },
  { name: "Rosa", value: "#db2777" },
  { name: "Gris", value: "#6b7280" },
] as const

export const DEFAULT_GENERIC_COLOR = "#2563eb"

export type GenericColorValue = (typeof GENERIC_COLOR_OPTIONS)[number]["value"]

export function getGenericColorOption(value: string | null | undefined) {
  const normalizedValue = value?.trim().toLowerCase()

  return GENERIC_COLOR_OPTIONS.find((option) => option.value.toLowerCase() === normalizedValue)
}
