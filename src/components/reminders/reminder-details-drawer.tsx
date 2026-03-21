"use client"

import * as React from "react"
import { trpc } from "@/lib/trpc"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CalendarClock, Circle, CheckCircle2, PaintBucket, Trash2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

export function ReminderDetailsDrawer({ reminder, open, onOpenChange }: { reminder: any | null, open: boolean, onOpenChange: (open: boolean) => void }) {
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
    let startStr = `${sd || format(new Date(), "yyyy-MM-dd")}T${st || "00:00:00"}`
    let endDateTime: string | null = null;
    
    if (ed) {
       endDateTime = `${ed}T${et || "23:59:59"}`
    } else if (et) {
       endDateTime = `${sd || format(new Date(), "yyyy-MM-dd")}T${et}`
    }

    const newStartISO = new Date(startStr).toISOString();
    const newEndISO = endDateTime ? new Date(endDateTime).toISOString() : null;
    const isAllDay = !st && !et;

    const updates: any = {};
    if (newStartISO !== reminder.trigger_at) updates.trigger_at = newStartISO;
    if (newEndISO !== (reminder.trigger_end_at || null)) updates.trigger_end_at = newEndISO;
    if (isAllDay !== reminder.is_all_day) updates.is_all_day = isAllDay;

    if (Object.keys(updates).length > 0) {
       handleBatchUpdate(updates);
    }
  }

  const handleBatchUpdate = async (updates: any) => {
    if (!reminder) return
    
    utils.reminders.list.setData(undefined, (old) => {
      if (!old) return old
      return old.map(r => r.id === reminder.id ? { ...r, ...updates } : r)
    })
    
    try {
      await updateMutation.mutateAsync({
        id: reminder.id,
        ...updates
      })
    } catch (e) {
      console.error(`Failed to update reminder`, e)
    }
  }

  const handleUpdate = async (field: string, value: any) => {
    if (!reminder) return
    
    // Optimistically update the query cache
    utils.reminders.list.setData(undefined, (old) => {
      if (!old) return old
      return old.map(r => r.id === reminder.id ? { ...r, [field]: value } : r)
    })
    
    try {
      await updateMutation.mutateAsync({
        id: reminder.id,
        [field]: value
      })
    } catch (e) {
      console.error(`Failed to update reminder ${field}`, e)
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
    
    utils.reminders.list.setData(undefined, (old) => {
      if (!old) return old
      return old.map(r => r.id === reminder.id ? { ...r, is_completed: newStatus } : r)
    })
    
    updateMutation.mutateAsync({
      id: reminder.id,
      is_completed: newStatus,
    })
  }

  const handleDelete = async () => {
    if (!reminder) return
    onOpenChange(false)
    await deleteMutation.mutateAsync({ id: reminder.id })
    utils.reminders.list.invalidate()
  }

  if (!reminder) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md w-full overflow-y-auto border-l shadow-2xl bg-background/95 backdrop-blur-sm p-0">
         <SheetHeader className="px-6 py-4 border-b bg-card/50 sticky top-0 z-10 backdrop-blur-md">
           <SheetTitle className="sr-only">Detalles del Recordatorio</SheetTitle>
           <SheetDescription className="sr-only">Edita tu recordatorio.</SheetDescription>
           
           <div className="flex justify-between items-center w-full">
             <div className="flex items-center gap-3">
               <button onClick={toggleStatus} className="text-muted-foreground hover:text-accent transition-colors">
                 {reminder.is_completed ? (
                   <CheckCircle2 className="w-6 h-6 text-accent" />
                 ) : (
                   <Circle className="w-6 h-6" />
                 )}
               </button>
               <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {reminder.is_completed ? "Acusado recibo" : "Recordatorio Activo"}
               </p>
             </div>
             
             <button onClick={handleDelete} className="text-muted-foreground hover:text-destructive transition-colors p-2" title="Eliminar Recordatorio">
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
                 "text-2xl font-semibold border-0 px-0 rounded-none shadow-none focus-visible:ring-0 h-auto break-words disabled:opacity-100 disabled:cursor-text",
                 reminder.is_completed && "line-through text-muted-foreground/60"
               )}
               placeholder="Título del recordatorio..."
             />
           </div>
           
           {/* Attributes Grid */}
           <div className="flex flex-col gap-1 rounded-xl border bg-card overflow-hidden">
             
             {/* Trigger Date Range */}             <div className="grid grid-cols-2 gap-px bg-border border-b">
               
               {/* Start Date */}
               <div className="flex flex-col bg-card p-3 hover:bg-muted/50 transition-colors">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground ml-1 mb-0.5">Fecha Inicio</span>
                  <Input 
                     type="date"
                     disabled={reminder.is_completed}
                     value={startDate}
                     onChange={e => setStartDate(e.target.value)}
                     onBlur={() => saveDateRange(startDate, startTime, endDate, endTime)}
                     className="h-8 border-0 shadow-none px-1 py-0 focus-visible:ring-0 text-sm font-medium w-full bg-transparent disabled:opacity-50 cursor-pointer"
                  />
               </div>

               {/* Start Time */}
               <div className="flex flex-col bg-card p-3 hover:bg-muted/50 transition-colors">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground ml-1 mb-0.5">Hora Inicio</span>
                  <Input 
                     type="time"
                     disabled={reminder.is_completed}
                     value={startTime}
                     onChange={e => setStartTime(e.target.value)}
                     onBlur={() => saveDateRange(startDate, startTime, endDate, endTime)}
                     className={cn("h-8 border-0 shadow-none px-1 py-0 focus-visible:ring-0 text-sm font-medium w-full bg-transparent disabled:opacity-50 cursor-pointer", !startTime && "text-muted-foreground")}
                  />
               </div>

               {/* End Date */}
               <div className="flex flex-col bg-card p-3 hover:bg-muted/50 transition-colors">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground ml-1 mb-0.5">Fecha Fin</span>
                  <Input 
                     type="date"
                     disabled={reminder.is_completed}
                     value={endDate}
                     onChange={e => setEndDate(e.target.value)}
                     onBlur={() => saveDateRange(startDate, startTime, endDate, endTime)}
                     className={cn("h-8 border-0 shadow-none px-1 py-0 focus-visible:ring-0 text-sm font-medium w-full bg-transparent disabled:opacity-50 cursor-pointer", !endDate && "text-muted-foreground")}
                  />
               </div>

               {/* End Time */}
               <div className="flex flex-col bg-card p-3 hover:bg-muted/50 transition-colors">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground ml-1 mb-0.5">Hora Fin</span>
                  <Input 
                     type="time"
                     disabled={reminder.is_completed}
                     value={endTime}
                     onChange={e => setEndTime(e.target.value)}
                     onBlur={() => saveDateRange(startDate, startTime, endDate, endTime)}
                     className={cn("h-8 border-0 shadow-none px-1 py-0 focus-visible:ring-0 text-sm font-medium w-full bg-transparent disabled:opacity-50 cursor-pointer", !endTime && "text-muted-foreground")}
                  />
               </div>

             </div>

             {/* Color */}
             <div className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors">
               <PaintBucket className="w-4 h-4 text-muted-foreground" />
               <div className="flex-1">
                 <Select 
                   value={reminder.color || "#ffedd5"} 
                   onValueChange={(v) => handleUpdate('color', v)}
                   disabled={reminder.is_completed}
                 >
                   <SelectTrigger className="h-auto py-0 px-1 border-0 shadow-none focus-visible:ring-0 bg-transparent text-sm font-medium w-full justify-start gap-2 hover:bg-transparent -ml-1 disabled:opacity-50">
                     <SelectValue placeholder="Color">
                       {reminder.color === "#ffedd5" && <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ffedd5]" /> Naranja</span>}
                       {reminder.color === "#fef9c3" && <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#fef9c3]" /> Amarillo</span>}
                       {reminder.color === "#dcfce7" && <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#dcfce7]" /> Verde</span>}
                       {reminder.color === "#dbeafe" && <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#dbeafe]" /> Azul</span>}
                       {reminder.color === "#f3e8ff" && <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#f3e8ff]" /> Púrpura</span>}
                       {reminder.color === "#ffe4e6" && <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ffe4e6]" /> Rosa</span>}
                     </SelectValue>
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="#ffedd5"><span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ffedd5] border border-[#f97316]" /> Naranja</span></SelectItem>
                     <SelectItem value="#fef9c3"><span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#fef9c3] border border-[#eab308]" /> Amarillo</span></SelectItem>
                     <SelectItem value="#dcfce7"><span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#dcfce7] border border-[#22c55e]" /> Verde</span></SelectItem>
                     <SelectItem value="#dbeafe"><span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#dbeafe] border border-[#3b82f6]" /> Azul</span></SelectItem>
                     <SelectItem value="#f3e8ff"><span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#f3e8ff] border border-[#a855f7]" /> Púrpura</span></SelectItem>
                     <SelectItem value="#ffe4e6"><span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ffe4e6] border border-[#f43f5e]" /> Rosa</span></SelectItem>
                   </SelectContent>
                 </Select>
               </div>
             </div>
           </div>

           {/* Description Editor */}
           <div className="space-y-2 pt-2">
             <h3 className="text-sm font-medium text-muted-foreground px-1 mb-1">Notas Adicionales</h3>
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
