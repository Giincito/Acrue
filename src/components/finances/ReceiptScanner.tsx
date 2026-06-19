"use client"

import { useRef, useState } from "react"
import { Camera, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { showUndoToast } from "@/components/ui/undo-toast"
import { AiThinking } from "@/components/ui/ai-thinking"
import { Button } from "@/components/ui/button"
import type { ReceiptData } from "@/types/ai"

interface VisionResponse {
  data?: ReceiptData
  undoId?: string
  error?: string
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

export function ReceiptScanner() {
  const [isScanning, setIsScanning] = useState(false)
  const [result, setResult] = useState<ReceiptData | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsScanning(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append("image", file)

      const response = await fetch("/api/ai/vision", {
        method: "POST",
        body: formData,
      })

      const data = await response.json() as VisionResponse

      if (!response.ok) {
        throw new Error(data.error || "Error al procesar la imagen")
      }

      if (!data.data) {
        throw new Error("No se recibieron datos del ticket")
      }

      setResult(data.data)
      toast.success("Ticket escaneado y registrado", {
        description: `Comercio: ${data.data.comercio} - Monto: $${Math.abs(data.data.monto).toLocaleString("es-AR")}`,
      })

      if (data.undoId) {
        showUndoToast({
          message: "Gasto registrado, puedes deshacerlo.",
          undoId: data.undoId,
          onUndo: () => {
            setResult(null)
          },
        })
      }
    } catch (error) {
      toast.error("Error al escanear", {
        description: getErrorMessage(error, "Error al procesar la imagen"),
      })
    } finally {
      setIsScanning(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 mt-8 w-full max-w-sm">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      {isScanning ? (
        <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-muted/30 w-full border border-border/50">
          <AiThinking text="Analizando..." className="justify-center" />
        </div>
      ) : result ? (
        <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-primary/5 w-full border border-primary/20">
          <div className="bg-primary/10 p-3 rounded-full">
            <CheckCircle2 className="h-6 w-6 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="font-medium">{result.comercio}</h3>
            <p className="text-2xl font-medium mt-1">${Math.abs(result.monto).toLocaleString("es-AR")}</p>
            <p className="text-xs text-muted-foreground mt-2 capitalize">
              {result.metodo_pago || "Efectivo"} - {result.fecha}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setResult(null)} className="mt-2 w-full cursor-pointer">
            Escanear otro
          </Button>
        </div>
      ) : (
        <Button
          size="lg"
          className="w-full h-14 rounded-xl shadow-lg hover:shadow-xl transition-[background-color,border-color,box-shadow,color,transform] duration-150 ease-out motion-reduce:transition-none gap-2 text-md cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <Camera className="h-5 w-5" />
          Escanear Ticket
        </Button>
      )}
    </div>
  )
}
