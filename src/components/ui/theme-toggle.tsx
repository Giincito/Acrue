"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/providers/theme-provider"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="h-9 w-9 my-auto"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none dark:-rotate-90 dark:scale-0 dark:opacity-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 opacity-0 transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none dark:rotate-0 dark:scale-100 dark:opacity-100" />
      <span className="sr-only">Cambiar tema</span>
    </Button>
  )
}
