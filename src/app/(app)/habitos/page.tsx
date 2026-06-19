import { Suspense } from "react"

import { HabitListView } from "@/components/habits/habit-list-view"

function ModuleFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
      Cargando hábitos...
    </div>
  )
}

export default function HabitsPage() {
  return (
    <Suspense fallback={<ModuleFallback />}>
      <HabitListView />
    </Suspense>
  )
}
