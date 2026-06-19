"use client"

import * as React from "react"
import { trpc } from "@/lib/trpc"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Circle, CheckCircle2, PaintBucket, Trash2 } from "lucide-react"
import { GenericColorLabel, GenericColorSelectItems } from "@/components/shared/generic-color-select"
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DEFAULT_GENERIC_COLOR } from "@/lib/generic-colors"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { toast } from "sonner"

interface ReminderDetails {
  id: string
  title: string
  description: string | null
  trigger_at: string
  trigger_end_at: string | null
  is_all_day: boolean
  is_completed: boolean
  color: string | null
}

type ReminderUpdate = Partial<
  Pick<
    ReminderDetails,
    "title" | "description" | "trigger_at" | "trigger_end_at" | "is_all_day" | "is_completed"
  >
> & { color?: string }

const DETAIL_TITLE_INPUT_CLASS =
  "min-h-11 w-full rounded-xl border-0 bg-transparent px-3 py-2 text-2xl font-medium shadow-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-text disabled:bg-muted/40 disabled:opacity-100"

const DETAIL_SELECT_TRIGGER_CLASS =
  "h-11 min-h-11 w-full justify-between rounded-lg border-0 bg-muted/35 px-3 py-2 text-sm font-medium shadow-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"

const DETAIL_TIME_INPUT_CLASS =
  "h-11 min-h-11 rounded-lg border-0 bg-muted/35 px-3 py-2 text-sm font-medium shadow-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"

const DETAIL_FIELD_LABEL_CLASS =
  "px-1 text-[10px] font-medium uppercase text-muted-foreground"

export function ReminderDetailsDrawer({
  reminder,
  open,
  onOpenChange,
}: {
  reminder: ReminderDetails | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const updateMutation = trpc.reminders.update.useMutation()
  const deleteMutation = trpc.reminders.delete.useMutation()
  const utils = trpc.useUtils()
  
  const [title, setTitle] = React.useState("")
  const [desc, setDesc] = React.useState("")
  
  const [startDate, setStartDate] = React.useState("")
  const [startTime, setStartTime] = React.useState("")
  const [endDate, setEndDate] = React.useState("")
  const [endTime, setEndTime] = React.useState("")
  
  React.useEffect(() => {
    if (reminder) {
      setTitle(reminder.title || "")
      setDesc(reminder.description || "")
      
      const sDate = new Date(reminder.trigger_at)
      setStartDate(format(sDate, "yyyy-MM-dd"))
      setStartTime(sDate.getHours() === 0 && sDate.getMinutes() === 0 ? "" : format(sDate, "HH:mm"))

      if (reminder.trigger_end_at) {
        const eDate = new Date(reminder.trigger_end_at)
        setEndDate(format(eDate, "yyyy-MM-dd"))
        setEndTime(format(eDate, "HH:mm"))
      } else {
        setEndDate("")
        setEndTime("")
      }
    }
  }, [reminder])

  const saveDateRange = (sd: string, st: string, ed: string, et: string) => {
    if (!reminder) return

    const startStr = `${sd || format(new Date(), "yyyy-MM-dd")}T${st || "00:00:00"}`
    let endDateTime: string | null = null;
    
    if (ed) {
       endDateTime = `${ed}T${et || "23:59:59"}`
    } else if (et) {
       endDateTime = `${sd || format(new Date(), "yyyy-MM-dd")}T${et}`
    }

    const newStartISO = new Date(startStr).toISOString();
    const newEndISO = endDateTime ? new Date(endDateTime).toISOString() : null;
    const isAllDay = !st && !et;

    const updates: ReminderUpdate = {};
    if (newStartISO !== reminder.trigger_at) updates.trigger_at = newStartISO;
    if (newEndISO !== (reminder.trigger_end_at || null)) updates.trigger_end_at = newEndISO;
    if (isAllDay !== reminder.is_all_day) updates.is_all_day = isAllDay;

    if (Object.keys(updates).length > 0) {
       handleBatchUpdate(updates);
    }
  }

  const handleBatchUpdate = async (updates: ReminderUpdate) => {
    if (!reminder) return
    
    utils.reminders.list.setData(undefined, (old: ReminderDetails[] | undefined) => {
      if (!old) return old
      return old.map(r => r.id === reminder.id ? { ...r, ...updates } : r)
    })
    
    try {
      await updateMutation.mutateAsync({
        id: reminder.id,
        ...updates
      })
    } catch {
      toast.error("No se pudo actualizar el recordatorio")
    }
  }

  const handleUpdate = async <K extends keyof ReminderUpdate>(field: K, value: ReminderUpdate[K]) => {
    if (!reminder) return
    
    // Optimistically update the query cache
    utils.reminders.list.setData(undefined, (old: ReminderDetails[] | undefined) => {
      if (!old) return old
      return old.map(r => r.id === reminder.id ? { ...r, [field]: value } : r)
    })
    
    try {
      await updateMutation.mutateAsync({
        id: reminder.id,
        [field]: value
      })
    } catch {
      toast.error("No se pudo actualizar el recordatorio")
    }
  }

  const handleTextBlur = (field: 'title' | 'description', value: string) => {
    if (reminder && reminder[field] !== value) {
      handleUpdate(field, value)
    }
  }

  const toggleStatus = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!reminder) return
    const isCompleted = reminder.is_completed
    const newStatus = !isCompleted
    
    utils.reminders.list.setData(undefined, (old: ReminderDetails[] | undefined) => {
      if (!old) return old
      return old.map(r => r.id === reminder.id ? { ...r, is_completed: newStatus } : r)
    })
    
    void updateMutation.mutateAsync({
      id: reminder.id,
      is_completed: newStatus,
    }).catch(() => {
      toast.error("No se pudo cambiar el estado")
      utils.reminders.list.invalidate()
    })
  }

  const handleDelete = async () => {
    if (!reminder) return
    onOpenChange(false)
    try {
      await deleteMutation.mutateAsync({ id: reminder.id })
      utils.reminders.list.invalidate()
    } catch {
      toast.error("No se pudo eliminar el recordatorio")
      utils.reminders.list.invalidate()
    }
  }

  if (!reminder) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md w-full overflow-y-auto border-l shadow-2xl bg-background/95 backdrop-blur-sm p-0">
         <SheetHeader className="px-6 py-4 border-b bg-card/50 sticky top-0 z-10 backdrop-blur-md">
           <SheetTitle className="sr-only">Detalles del recordatorio</SheetTitle>
           <SheetDescription className="sr-only">Edita tu recordatorio.</SheetDescription>
           
           <div className="flex justify-between items-center w-full">
             <div className="flex items-center gap-3">
                <button type="button" onClick={toggleStatus} aria-label={reminder.is_completed ? "Marcar recordatorio como activo" : "Marcar recordatorio como completado"} aria-pressed={reminder.is_completed} className="text-muted-foreground hover:text-accent transition-colors cursor-pointer">
                 {reminder.is_completed ? (
                   <CheckCircle2 className="w-6 h-6 text-accent" />
                 ) : (
                   <Circle className="w-6 h-6" />
                 )}
               </button>
               <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {reminder.is_completed ? "Acusado recibo" : "Recordatorio activo"}
               </p>
             </div>
             
              <button type="button" onClick={handleDelete} aria-label="Eliminar recordatorio" className="text-muted-foreground hover:text-destructive transition-colors p-2 cursor-pointer" title="Eliminar recordatorio">
               <Trash2 className="w-4 h-4" />
             </button>
           </div>
         </SheetHeader>
         
         <div className="flex flex-col gap-6 p-6">
           {/* Title Editor */}
           <div className="space-y-1">
             <Input 
               value={title}
               disabled={reminder.is_completed}
               onChange={(e) => setTitle(e.target.value)}
               onBlur={() => handleTextBlur('title', title)}
               className={cn(
                 DETAIL_TITLE_INPUT_CLASS,
                 reminder.is_completed && "line-through text-muted-foreground/60"
               )}
               placeholder="Título del recordatorio..."
             />
           </div>
           
           {/* Attributes Grid */}
           <div className="flex flex-col gap-1 rounded-xl border bg-card overflow-hidden">
             
             {/* Trigger Date Range */}
             <div className="grid grid-cols-2 gap-2 border-b p-3">
               
               {/* Start Date */}
               <div className="space-y-1">
                  <span className={DETAIL_FIELD_LABEL_CLASS}>Fecha inicio</span>
                  <Input 
                     type="date"
                     disabled={reminder.is_completed}
                     value={startDate}
                     onChange={e => setStartDate(e.target.value)}
                     onBlur={() => saveDateRange(startDate, startTime, endDate, endTime)}
                     className={DETAIL_TIME_INPUT_CLASS}
                  />
               </div>

               {/* Start Time */}
               <div className="space-y-1">
                  <span className={DETAIL_FIELD_LABEL_CLASS}>Hora inicio</span>
                  <Input 
                     type="time"
                     disabled={reminder.is_completed}
                     value={startTime}
                     onChange={e => setStartTime(e.target.value)}
                     onBlur={() => saveDateRange(startDate, startTime, endDate, endTime)}
                     className={cn(DETAIL_TIME_INPUT_CLASS, !startTime && "text-muted-foreground")}
                  />
               </div>

               {/* End Date */}
               <div className="space-y-1">
                  <span className={DETAIL_FIELD_LABEL_CLASS}>Fecha fin</span>
                  <Input 
                     type="date"
                     disabled={reminder.is_completed}
                     value={endDate}
                     onChange={e => setEndDate(e.target.value)}
                     onBlur={() => saveDateRange(startDate, startTime, endDate, endTime)}
                     className={cn(DETAIL_TIME_INPUT_CLASS, !endDate && "text-muted-foreground")}
                  />
               </div>

               {/* End Time */}
               <div className="space-y-1">
                  <span className={DETAIL_FIELD_LABEL_CLASS}>Hora fin</span>
                  <Input 
                     type="time"
                     disabled={reminder.is_completed}
                     value={endTime}
                     onChange={e => setEndTime(e.target.value)}
                     onBlur={() => saveDateRange(startDate, startTime, endDate, endTime)}
                     className={cn(DETAIL_TIME_INPUT_CLASS, !endTime && "text-muted-foreground")}
                  />
               </div>

             </div>

             {/* Color */}
             <div className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors">
               <PaintBucket className="w-4 h-4 text-muted-foreground" />
               <div className="flex-1 min-w-0">
                 <Select
                   value={reminder.color || DEFAULT_GENERIC_COLOR}
                   onValueChange={(v) => handleUpdate('color', v ?? DEFAULT_GENERIC_COLOR)}
                   disabled={reminder.is_completed}
                 >
                   <SelectTrigger className={DETAIL_SELECT_TRIGGER_CLASS}>
                     <SelectValue placeholder="Color">
                       <GenericColorLabel value={reminder.color || DEFAULT_GENERIC_COLOR} swatchClassName="h-3 w-3" />
                     </SelectValue>
                   </SelectTrigger>
                   <SelectContent>
                     <GenericColorSelectItems swatchClassName="h-3 w-3" />
                   </SelectContent>
                 </Select>
               </div>
             </div>
           </div>

           {/* Description Editor */}
           <div className="space-y-2 pt-2">
             <h3 className="text-sm font-medium text-muted-foreground px-1 mb-1">Notas adicionales</h3>
             <Textarea 
               value={desc}
               disabled={reminder.is_completed}
               onChange={(e) => setDesc(e.target.value)}
               onBlur={() => handleTextBlur('description', desc)}
               className="min-h-[250px] resize-none border px-4 py-3 bg-muted/20 focus-visible:bg-transparent text-sm shadow-sm transition-colors rounded-xl disabled:opacity-70 disabled:cursor-text"
               placeholder="Añadir una nota detallada..."
             />
           </div>

         </div>
      </SheetContent>
    </Sheet>
  )
}
