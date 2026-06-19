"use client"

import * as React from "react"

type Theme = "dark" | "light" | "system"
type ResolvedTheme = "dark" | "light"

type ThemeProviderProps = React.PropsWithChildren<{
  attribute?: "class" | string
  defaultTheme?: Theme
  enableSystem?: boolean
  storageKey?: string
}>

type ThemeContextValue = {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const THEME_STORAGE_KEY = "acrue-theme:v1"
const ThemeContext = React.createContext<ThemeContextValue | null>(null)

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || !window.matchMedia) return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function readStoredTheme(storageKey: string): Theme | null {
  try {
    const value = window.localStorage.getItem(storageKey)
    return value === "dark" || value === "light" || value === "system" ? value : null
  } catch {
    return null
  }
}

function writeStoredTheme(storageKey: string, theme: Theme) {
  try {
    window.localStorage.setItem(storageKey, theme)
  } catch {
    return
  }
}

function applyTheme(theme: Theme, enableSystem: boolean): ResolvedTheme {
  const resolvedTheme = theme === "system" && enableSystem ? getSystemTheme() : theme === "dark" ? "dark" : "light"
  const root = document.documentElement

  root.classList.remove("dark", "light")
  root.classList.add(resolvedTheme)
  root.style.colorScheme = resolvedTheme

  return resolvedTheme
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  enableSystem = true,
  storageKey = THEME_STORAGE_KEY,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = React.useState<ResolvedTheme>("light")

  React.useEffect(() => {
    setThemeState(readStoredTheme(storageKey) ?? defaultTheme)
  }, [defaultTheme, storageKey])

  React.useEffect(() => {
    setResolvedTheme(applyTheme(theme, enableSystem))
    writeStoredTheme(storageKey, theme)
  }, [enableSystem, storageKey, theme])

  React.useEffect(() => {
    if (!enableSystem || theme !== "system" || !window.matchMedia) return

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = () => setResolvedTheme(applyTheme("system", true))

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [enableSystem, theme])

  const setTheme = React.useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme)
  }, [])

  const value = React.useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [resolvedTheme, setTheme, theme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider")
  }

  return context
}
