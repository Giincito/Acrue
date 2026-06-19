"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download, Loader2 } from "lucide-react"

interface ExportCSVModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ExportErrorResponse {
  error?: string
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

/**
 * Modal with date range picker for exporting expenses as CSV.
 * Triggers download from /api/finanzas/export.
 */
export function ExportCSVModal({ open, onOpenChange }: ExportCSVModalProps) {
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [from, setFrom] = useState(firstOfMonth.toISOString().split("T")[0])
  const [to, setTo] = useState(now.toISOString().split("T")[0])
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    if (!from || !to) {
      toast.error("Seleccioná un rango de fechas")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/finanzas/export?from=${from}&to=${to}`)
      if (!res.ok) {
        const data = await res.json().catch((): ExportErrorResponse => ({}))
        throw new Error(data.error || "Error al exportar")
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `acrue-gastos-${from}-a-${to}.csv`
      a.click()
      URL.revokeObjectURL(url)

      toast.success("CSV exportado correctamente")
      onOpenChange(false)
    } catch (error) {
      toast.error("Error al exportar", { description: getErrorMessage(error, "Error al exportar") })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Exportar gastos</DialogTitle>
          <DialogDescription>
            Seleccioná el rango de fechas para exportar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="export-from">Desde</Label>
              <Input
                id="export-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="export-to">Hasta</Label>
              <Input
                id="export-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleExport}
              disabled={loading}
              className="w-full gap-1.5 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Descargar CSV
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
