import { Suspense } from "react"
import { ModuleShell } from "@/components/layout/module-shell"
import { AiThinking } from "@/components/ui/ai-thinking"
import { CerebroView } from "@/components/cerebro/cerebro-view"

export default function CerebroPage() {
  return (
    <ModuleShell width="wide" contentClassName="space-y-6">
      <Suspense fallback={<AiThinking text="Cargando..." />}>
        <CerebroView />
      </Suspense>
    </ModuleShell>
  )
}
