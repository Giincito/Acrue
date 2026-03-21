"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  // Hydrate custom accent color on mount globally
  React.useEffect(() => {
    const savedColor = localStorage.getItem('acrue_accent')
    if (savedColor) {
      if (savedColor === 'mono') {
        document.documentElement.classList.add('theme-mono')
        document.documentElement.style.removeProperty('--accent')
        document.documentElement.style.removeProperty('--accent-foreground')
        document.documentElement.style.removeProperty('--ring')
      } else {
        document.documentElement.classList.remove('theme-mono')
        document.documentElement.style.setProperty('--accent', `hsl(${savedColor})`)
        document.documentElement.style.setProperty('--ring', `hsl(${savedColor})`)
        document.documentElement.style.setProperty('--accent-foreground', '#FFFFFF')
      }
    }
  }, [])

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
