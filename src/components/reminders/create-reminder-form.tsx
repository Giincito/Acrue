"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { trpc } from "@/lib/trpc"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Plus } from "lucide-react"
import { format } from "date-fns"
import { z } from "zod"

const FormSchema = z.object({
  title: z.string().min(1, "Title is required").max(600),
  description: z.string().optional().nullable(),
  startDate: z.string().min(1, "Requerido"),
  startTime: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  color: z.string().optional(),
})

type FormValues = z.infer<typeof FormSchema>

import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface CreateReminderFormProps {
  defaultTriggerAt?: string | null
  defaultTriggerEndAt?: string | null
  onSuccess?: () => void
}

export function CreateReminderForm({ defaultTriggerAt, defaultTriggerEndAt, onSuccess }: CreateReminderFormProps) {
  const trpcContext = trpc.useUtils()
  const createMutation = trpc.reminders.create.useMutation({
    onSuccess: () => {
      trpcContext.reminders.list.invalidate()
    }
  })
  
  // Calculate default values based on calendar selection
  let initStartDate = format(new Date(), "yyyy-MM-dd");
  let initStartTime = "";
  let initEndDate = "";
  let initEndTime = "";

  if (defaultTriggerAt) {
    const startD = new Date(defaultTriggerAt);
    initStartDate = format(startD, "yyyy-MM-dd");
    initStartTime = (startD.getHours() !== 0 || startD.getMinutes() !== 0) ? format(startD, "HH:mm") : "";

    if (defaultTriggerEndAt) {
      const endD = new Date(defaultTriggerEndAt);
      const diffHours = (endD.getTime() - startD.getTime()) / (1000 * 60 * 60);
      
      // If exactly 24 hours at midnight, it's a 1-day selection in month view.
      if (!(diffHours === 24 && startD.getHours() === 0 && endD.getHours() === 0)) {
        // If the end time is exactly midnight (e.g. multi-day drag in month view), subtract a minute 
        // to make the end date inclusive for the user.
        const adjustedEnd = (endD.getHours() === 0 && endD.getMinutes() === 0) 
            ? new Date(endD.getTime() - 60000) 
            : endD;
            
        initEndDate = format(adjustedEnd, "yyyy-MM-dd");
        initEndTime = (endD.getHours() !== 0 || endD.getMinutes() !== 0) ? format(endD, "HH:mm") : "";
      }
    }
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema) as any,
    defaultValues: {
      title: "",
      description: "",
      startDate: initStartDate,
      startTime: initStartTime,
      endDate: initEndDate,
      endTime: initEndTime,
      color: "#ffedd5"
    },
  })

  const onSubmit = async (values: FormValues) => {
    try {
      let startStr = `${values.startDate}T${values.startTime || "00:00:00"}`
      
      let endDateTime: string | null = null;
      if (values.endDate) {
         endDateTime = `${values.endDate}T${values.endTime || "23:59:59"}`
      } else if (values.endTime) {
         endDateTime = `${values.startDate}T${values.endTime}`
      }

      const isAllDay = !values.startTime && !values.endTime;

      const payload = {
         title: values.title,
         description: values.description,
         trigger_at: new Date(startStr).toISOString(),
         trigger_end_at: endDateTime ? new Date(endDateTime).toISOString() : null,
         color: values.color,
         is_completed: false,
         is_all_day: isAllDay
      }
      await createMutation.mutateAsync(payload)
      form.reset()
      onSuccess?.()
      toast.success("Recordatorio creado")
    } catch (e: any) {
      console.error("Failed to create reminder", e)
      toast.error(e.message || "Error al crear recordatorio")
    }
  }

  const onError = (errors: any) => {
    console.error("Validation errors", errors)
    toast.error("Revisá los campos")
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-4 px-1">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input placeholder="Ej: Llamar al médico..." {...field} className="text-lg bg-transparent border-none shadow-none focus-visible:ring-0 px-2 h-auto font-medium" autoFocus />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input placeholder="Detalles (opcional)..." {...field} value={field.value || ""} className="text-sm bg-transparent border-none shadow-none focus-visible:ring-0 px-2 h-auto" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 gap-3 px-2 pt-1 pb-2">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <div className="text-[10px] font-semibold uppercase text-muted-foreground ml-1 tracking-wider">Fecha Inicio</div>
                <FormControl>
                  <Input 
                    type="date" 
                    {...field} 
                    value={field.value || ""}
                    className="h-10 px-3 text-xs sm:text-sm bg-muted/30 border-transparent hover:bg-muted/50 focus-visible:bg-transparent transition-colors hover:border-border cursor-pointer shadow-sm" 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <div className="text-[10px] font-semibold uppercase text-muted-foreground ml-1 tracking-wider">Hora Inicio (Opcional)</div>
                <FormControl>
                  <Input 
                    type="time" 
                    {...field} 
                    value={field.value || ""}
                    className={cn(
                      "h-10 px-3 text-xs sm:text-sm bg-muted/30 border-transparent hover:bg-muted/50 focus-visible:bg-transparent transition-colors hover:border-border cursor-pointer shadow-sm",
                      !field.value && "text-muted-foreground"
                    )}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <div className="text-[10px] font-semibold uppercase text-muted-foreground ml-1 tracking-wider">Fecha Fin (Opcional)</div>
                <FormControl>
                  <Input 
                    type="date" 
                    {...field} 
                    value={field.value || ""}
                    className={cn(
                      "h-10 px-3 text-xs sm:text-sm bg-muted/30 border-transparent hover:bg-muted/50 focus-visible:bg-transparent transition-colors hover:border-border cursor-pointer shadow-sm",
                      !field.value && "text-muted-foreground"
                    )}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <div className="text-[10px] font-semibold uppercase text-muted-foreground ml-1 tracking-wider">Hora Fin (Opcional)</div>
                <FormControl>
                  <Input 
                    type="time" 
                    {...field} 
                    value={field.value || ""}
                    className={cn(
                      "h-10 px-3 text-xs sm:text-sm bg-muted/30 border-transparent hover:bg-muted/50 focus-visible:bg-transparent transition-colors hover:border-border cursor-pointer shadow-sm",
                      !field.value && "text-muted-foreground"
                    )}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center justify-between px-2 pt-2 pb-1">
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <Select onValueChange={field.onChange} defaultValue={field.value || "#ffedd5"}>
                  <FormControl>
                    <SelectTrigger className="h-9 text-xs w-[130px] bg-muted/20 border-transparent hover:bg-muted/40 transition-colors shadow-none">
                      <SelectValue placeholder="Color">
                         {field.value === "#ffedd5" && <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#ffedd5]" /> Naranja</span>}
                         {field.value === "#fef9c3" && <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#fef9c3]" /> Amarillo</span>}
                         {field.value === "#dcfce7" && <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#dcfce7]" /> Verde</span>}
                         {field.value === "#dbeafe" && <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#dbeafe]" /> Azul</span>}
                         {field.value === "#f3e8ff" && <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#f3e8ff]" /> Púrpura</span>}
                         {field.value === "#ffe4e6" && <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#ffe4e6]" /> Rosa</span>}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="#ffedd5"><span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#ffedd5] border border-[#f97316]" /> Naranja</span></SelectItem>
                    <SelectItem value="#fef9c3"><span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#fef9c3] border border-[#eab308]" /> Amarillo</span></SelectItem>
                    <SelectItem value="#dcfce7"><span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#dcfce7] border border-[#22c55e]" /> Verde</span></SelectItem>
                    <SelectItem value="#dbeafe"><span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#dbeafe] border border-[#3b82f6]" /> Azul</span></SelectItem>
                    <SelectItem value="#f3e8ff"><span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#f3e8ff] border border-[#a855f7]" /> Púrpura</span></SelectItem>
                    <SelectItem value="#ffe4e6"><span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#ffe4e6] border border-[#f43f5e]" /> Rosa</span></SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" size="sm" disabled={createMutation.isPending} className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-5 shadow-sm font-medium h-9">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {createMutation.isPending ? "Guardando..." : "Crear"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
