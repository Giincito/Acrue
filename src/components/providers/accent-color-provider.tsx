"use client"

import * as React from "react"
import {
  ACCENT_COLOR_EVENT,
  ACCENT_COLOR_STORAGE_KEY,
  DEFAULT_ACCENT_COLOR,
  getAccentColorOption,
} from "@/lib/accent-colors"

function readStoredAccentColor() {
  try {
    return localStorage.getItem(ACCENT_COLOR_STORAGE_KEY)
  } catch {
    return null
  }
}

export function applyAccentColor(value: string | null | undefined) {
  const option = getAccentColorOption(value)
  const root = document.documentElement

  root.style.setProperty("--accent", option.value)
  root.style.setProperty("--ring", option.value)
  root.style.setProperty("--sidebar-ring", option.value)
}

export function AccentColorProvider({ children }: React.PropsWithChildren) {
  React.useEffect(() => {
    const syncAccentColor = () => applyAccentColor(readStoredAccentColor() ?? DEFAULT_ACCENT_COLOR.value)

    syncAccentColor()

    window.addEventListener(ACCENT_COLOR_EVENT, syncAccentColor)
    window.addEventListener("storage", syncAccentColor)

    return () => {
      window.removeEventListener(ACCENT_COLOR_EVENT, syncAccentColor)
      window.removeEventListener("storage", syncAccentColor)
    }
  }, [])

  return <>{children}</>
}
