"use client"

import * as React from "react"
import { Check, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { TaskIcon } from "@/components/ui/TaskIcon"
import { ICON_SET } from "@/lib/icons"
import { cn } from "@/lib/utils"

interface IconPickerProps {
  value?: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
}

export function IconPicker({ value, onChange, disabled }: IconPickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-input bg-transparent hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50 transition-colors cursor-pointer",
          !value && "border-dashed"
        )}
        title={value ? "Cambiar ícono" : "Agregar ícono"}
      >
        {value ? (
          <TaskIcon icon={value} size={16} className="opacity-100" />
        ) : (
          <span className="text-muted-foreground/50 text-xs font-medium">+</span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-3" align="start">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-medium text-muted-foreground">Elegir ícono</span>
          {value && (
            <button
              onClick={() => {
                onChange(null)
                setOpen(false)
              }}
              className="text-xs text-destructive hover:underline flex items-center"
            >
              <X className="w-3 h-3 mr-1" />
              Quitar
            </button>
          )}
        </div>
        <div className="grid grid-cols-5 gap-2">
          {ICON_SET.map((icon) => {
            const isSelected = value === icon.id
            return (
              <button
                key={icon.id}
                onClick={() => {
                  onChange(icon.id)
                  setOpen(false)
                }}
                title={icon.label}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground transition-colors",
                  isSelected ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : "text-foreground"
                )}
              >
                <TaskIcon 
                  icon={icon.id} 
                  size={18} 
                  className={isSelected ? "opacity-100" : "opacity-80"} 
                />
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
