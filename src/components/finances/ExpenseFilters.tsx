"use client"

import { trpc } from "@/lib/trpc"
import { Filter, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ExpenseFilters as Filters } from "@/types/finance"

interface ExpenseFiltersProps {
  filters: Filters
  onChange: (filters: Filters) => void
}

const DATE_PRESETS = [
  { label: "Esta semana", value: "this_week" },
  { label: "Este mes", value: "this_month" },
] as const

interface CategoryOption {
  id: string
  name: string
}

function getDateRange(preset: string) {
  const now = new Date()
  if (preset === "this_week") {
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    return {
      dateFrom: monday.toISOString().split("T")[0],
      dateTo: now.toISOString().split("T")[0],
    }
  }
  if (preset === "this_month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return {
      dateFrom: start.toISOString().split("T")[0],
      dateTo: now.toISOString().split("T")[0],
    }
  }
  return {}
}

/**
 * Filter bar for the expense list with category dropdown and date presets.
 */
export function ExpenseFilters({ filters, onChange }: ExpenseFiltersProps) {
  const { data: categories } = trpc.categories.list.useQuery()

  const hasFilters = filters.categoryId || filters.datePreset || filters.dateFrom

  const clearFilters = () => onChange({})

  const setPreset = (preset: typeof DATE_PRESETS[number]["value"]) => {
    const range = getDateRange(preset)
    onChange({ ...filters, ...range, datePreset: preset })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Filter className="h-3.5 w-3.5" />
      </div>

      {/* Date presets */}
      {DATE_PRESETS.map((preset) => (
        <Button
          key={preset.value}
          variant={filters.datePreset === preset.value ? "default" : "outline"}
          size="sm"
          className="h-7 text-xs cursor-pointer"
          onClick={() =>
            filters.datePreset === preset.value
              ? onChange({ ...filters, dateFrom: undefined, dateTo: undefined, datePreset: undefined })
              : setPreset(preset.value)
          }
        >
          {preset.label}
        </Button>
      ))}

      {/* Category filter */}
      {categories && categories.length > 0 && (
        <select
          value={filters.categoryId ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              categoryId: e.target.value || undefined,
            })
          }
          className="h-7 rounded-md border border-input bg-background px-2 text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
          id="expense-filter-category"
        >
          <option value="">Todas las categorías</option>
          {(categories as CategoryOption[]).map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      )}

      {/* Clear filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1 cursor-pointer"
          onClick={clearFilters}
          id="clear-filters-btn"
        >
          <X className="h-3 w-3" />
          Limpiar
        </Button>
      )}
    </div>
  )
}
