import { SelectItem } from "@/components/ui/select"
import { GENERIC_COLOR_OPTIONS, getGenericColorOption } from "@/lib/generic-colors"
import { cn } from "@/lib/utils"

interface GenericColorLabelProps {
  value: string | null | undefined
  fallbackLabel?: string
  swatchClassName?: string
}

export function GenericColorLabel({
  value,
  fallbackLabel = "Color personalizado",
  swatchClassName,
}: GenericColorLabelProps) {
  const colorOption = getGenericColorOption(value)
  const swatchValue = colorOption?.value ?? value

  if (!swatchValue) {
    return <span className="text-muted-foreground">{fallbackLabel}</span>
  }

  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        aria-hidden="true"
        className={cn("h-2.5 w-2.5 shrink-0 rounded-full border border-black/10 dark:border-white/15", swatchClassName)}
        style={{ backgroundColor: swatchValue }}
      />
      <span className="truncate">{colorOption?.name ?? fallbackLabel}</span>
    </span>
  )
}

interface GenericColorSelectItemsProps {
  swatchClassName?: string
}

export function GenericColorSelectItems({ swatchClassName }: GenericColorSelectItemsProps) {
  return (
    <>
      {GENERIC_COLOR_OPTIONS.map((option) => (
        <SelectItem key={option.value} value={option.value}>
          <GenericColorLabel value={option.value} swatchClassName={swatchClassName} />
        </SelectItem>
      ))}
    </>
  )
}
