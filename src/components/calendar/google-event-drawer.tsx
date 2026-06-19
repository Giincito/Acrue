"use client"

import * as React from "react"
import { trpc } from "@/lib/trpc"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { format, isValid } from "date-fns"
import { es } from "date-fns/locale/es"
import { CalendarIcon, Trash2, CalendarHeart } from "lucide-react"
import { toast } from "sonner"

export interface GoogleCalendarEvent {
  id: string
  gcalEventId: string | null
  source: string
  title: string
  rawTitle: string
  description: string
  start: string
  end: string | null
  is_all_day: boolean
}

export function GoogleEventDrawer({
  event,
  open,
  onOpenChange,
}: {
  event: GoogleCalendarEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const updateMutation = trpc.integrations.updateGoogleEvent.useMutation()
  const deleteMutation = trpc.integrations.deleteGoogleEvent.useMutation()
  const utils = trpc.useUtils()
  
  const [title, setTitle] = React.useState("")
  const [desc, setDesc] = React.useState("")
  const isGoogleEvent = event?.source === "google" && Boolean(event.gcalEventId)
  
  React.useEffect(() => {
    if (event) {
      setTitle(event.rawTitle || "")
      setDesc(event.description || "")
    }
  }, [event])

  const handleTextBlur = async (field: 'title' | 'description', value: string) => {
    if (!event || !isGoogleEvent) return
    const originalValue = field === 'title' ? event.rawTitle : event.description
    
    if (originalValue !== value) {
      try {
        await updateMutation.mutateAsync({
          id: event.id,
          title: field === 'title' ? value : (event.rawTitle || 'Sin Título'),
          description: field === 'description' ? value : (event.description || ''),
          start_at: event.start,
          end_at: event.end ?? event.start,
          is_all_day: event.is_all_day || false
        })
        utils.integrations.googleCalendarEvents.invalidate()
      } catch {
        toast.error("No se pudo actualizar el evento")
      }
    }
  }

  const handleDelete = async () => {
    if (!event || !isGoogleEvent) return
    onOpenChange(false)
    try {
      await deleteMutation.mutateAsync({ id: event.id })
      utils.integrations.googleCalendarEvents.invalidate()
    } catch {
      toast.error("No se pudo eliminar el evento")
    }
  }

  if (!event) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md w-full overflow-y-auto border-l shadow-2xl bg-background/95 backdrop-blur-sm p-0">
         <SheetHeader className="px-6 py-4 border-b bg-card/50 sticky top-0 z-10 backdrop-blur-md">
           <SheetTitle className="sr-only">Detalles del evento</SheetTitle>
           <SheetDescription className="sr-only">Visualiza los datos de este evento.</SheetDescription>
           
           <div className="flex justify-between items-center w-full">
             <div className="flex items-center gap-2">
               <CalendarHeart className="w-5 h-5 text-success" />
               <p className="text-xs font-medium text-success uppercase tracking-wider">
                  {isGoogleEvent ? "Evento de Google Calendar" : "Evento de Acrue"}
               </p>
             </div>
             
             {isGoogleEvent && (
                <button type="button" onClick={handleDelete} disabled={deleteMutation.isPending} className="text-muted-foreground hover:text-destructive transition-colors p-2 disabled:opacity-50 cursor-pointer" aria-label="Eliminar evento de Google Calendar" title="Eliminar de Google Calendar">
                 <Trash2 className="w-4 h-4" />
               </button>
             )}
           </div>
         </SheetHeader>
         
         <div className="flex flex-col gap-6 p-6">
           {/* Title Editor */}
           <div className="space-y-1">
             <Input 
               value={title}
               onChange={(e) => setTitle(e.target.value)}
               onBlur={() => handleTextBlur('title', title)}
               disabled={updateMutation.isPending}
               readOnly={!isGoogleEvent}
               className="text-2xl font-medium border-0 px-0 rounded-none shadow-none focus-visible:ring-0 h-auto break-words"
               placeholder="Título del evento..."
             />
           </div>
           
           {/* Attributes Grid */}
           <div className="flex flex-col gap-1 rounded-xl border bg-card overflow-hidden">
             
             {/* Read-Only Date info for external events */}
             <div className="flex items-center gap-3 p-3 text-muted-foreground hover:bg-muted/50 transition-colors">
               <CalendarIcon className="w-4 h-4" />
               <div className="flex-1 text-sm">
                 {event.start && isValid(new Date(event.start)) 
                   ? format(new Date(event.start), event.is_all_day ? "PPP" : "PPP, p", { locale: es }) 
                   : <span>Sin fecha</span>}
                 {!event.is_all_day && event.end && ` - ${format(new Date(event.end), "p", { locale: es })}`}
               </div>
             </div>
           </div>

           {/* Description Editor */}
           <div className="space-y-2 pt-2">
             <h3 className="text-sm font-medium text-muted-foreground px-1 mb-1">Notas del evento</h3>
             <Textarea 
               value={desc}
               onChange={(e) => setDesc(e.target.value)}
               onBlur={() => handleTextBlur('description', desc)}
               disabled={updateMutation.isPending}
               readOnly={!isGoogleEvent}
               className="min-h-[250px] resize-none border px-4 py-3 bg-muted/20 focus-visible:bg-transparent text-sm shadow-sm transition-colors rounded-xl"
               placeholder="Añadir una nota de Google..."
             />
           </div>
           
         </div>
      </SheetContent>
    </Sheet>
  )
}
