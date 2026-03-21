import { Wallet } from "lucide-react"

export default function FinancesPage() {
  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/50 mb-6">
        <Wallet className="h-10 w-10 text-muted-foreground" />
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">Finanzas</h1>
      <p className="text-muted-foreground mt-3 max-w-sm">
        Esta sección está en construcción. Pronto podrás analizar tus gastos e ingresos con gráficos interactivos.
      </p>
    </div>
  )
}