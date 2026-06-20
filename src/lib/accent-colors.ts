export const ACCENT_COLOR_STORAGE_KEY = "acrue_ui_accent"
export const ACCENT_COLOR_EVENT = "acrue_accent_changed"

export const ACCENT_COLOR_OPTIONS = [
  { id: "blue", label: "Azul", value: "#2282fa" },
  { id: "green", label: "Verde", value: "#3A7D44" },
  { id: "red", label: "Rojo", value: "#9B3A3A" },
  { id: "yellow", label: "Amarillo", value: "#8A650E" },
  { id: "orange", label: "Naranja", value: "#A14F16" },
] as const

export type AccentColorValue = (typeof ACCENT_COLOR_OPTIONS)[number]["value"]

export const DEFAULT_ACCENT_COLOR = ACCENT_COLOR_OPTIONS[0]

export function getAccentColorOption(value: string | null | undefined) {
  return ACCENT_COLOR_OPTIONS.find((option) => option.value === value) ?? DEFAULT_ACCENT_COLOR
}

export function isAccentColorValue(value: string | null | undefined): value is AccentColorValue {
  return ACCENT_COLOR_OPTIONS.some((option) => option.value === value)
}
