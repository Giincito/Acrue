"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { trpc } from "@/lib/trpc"
import { useTaskStore } from "@/store/useTaskStore"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreateTaskSchema, TaskStatus } from "@/server/schema/task"
import { CalendarIcon, Plus } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface CreateTaskFormProps {
  defaultStatus?: TaskStatus
  onSuccess?: () => void
}

export function CreateTaskForm({ defaultStatus = "inbox", onSuccess }: CreateTaskFormProps) {
  const { addTask } = useTaskStore()
  const createMutation = trpc.tasks.create.useMutation()
  
  const form = useForm<z.infer<typeof CreateTaskSchema>>({
    resolver: zodResolver(CreateTaskSchema),
    defaultValues: {
      title: "",
      context_tag: null,
      status: defaultStatus,
      priority: 2,
      due_at: null,
      project_id: null,
      is_recurring: false,
      recurrence_rule: null
    },
  })

  const onSubmit = async (values: z.infer<typeof CreateTaskSchema>) => {
    try {
      // Optimistically add task locally. Notice we don't have the final ID 
      // but we use a temporary one for immediate render.
      const tempId = crypto.randomUUID()
      addTask({
        ...values,
        id: tempId,
        user_id: "temp_user",
        completed_at: null,
        created_at: new Date().toISOString(),
        context_tag: values.context_tag || null,
        due_at: values.due_at || null,
        project_id: values.project_id || null,
        recurrence_rule: values.recurrence_rule || null
      })
      
      form.reset()
      onSuccess?.()
      
      // Submit to backend
      await createMutation.mutateAsync(values)
      // We should ideally fetch tasks again or replace tempId with realId,
      // but tRPC query invalidation will handle the sync for us.
    } catch (e) {
      console.error("Failed to create task", e)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input placeholder="Ej: Pagar la luz..." {...field} className="text-lg bg-transparent border-none shadow-none focus-visible:ring-0 px-0 h-auto font-medium" autoFocus />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Default due_at popover */}
          <FormField
            control={form.control}
            name="due_at"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "h-8 text-xs font-normal",
                          !field.value && "text-muted-foreground border-dashed"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {field.value ? format(new Date(field.value), "PPP", { locale: es }) : <span>Fecha</span>}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) => field.onChange(date?.toISOString())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <Select onValueChange={(v) => field.onChange(parseInt(v, 10))} defaultValue={field.value.toString()}>
                  <FormControl>
                    <SelectTrigger className="h-8 text-xs w-[110px]">
                      <SelectValue placeholder="Prioridad" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1">Alta (1)</SelectItem>
                    <SelectItem value="2">Media (2)</SelectItem>
                    <SelectItem value="3">Baja (3)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Context Tag Selector */}
          <FormField
            control={form.control}
            name="context_tag"
            render={({ field }) => (
              <FormItem>
                <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                  <FormControl>
                    <SelectTrigger className="h-8 text-xs w-[110px]">
                      <SelectValue placeholder="Contexto" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Sin contexto</SelectItem>
                    <SelectItem value="@hogar">@hogar</SelectItem>
                    <SelectItem value="@universidad">@universidad</SelectItem>
                    <SelectItem value="@personal">@personal</SelectItem>
                    <SelectItem value="@compras">@compras</SelectItem>
                    <SelectItem value="@trabajo">@trabajo</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Basic Recurrence Switch */}
          <FormField
            control={form.control}
            name="is_recurring"
            render={({ field }) => (
              <FormItem>
                <Select 
                  onValueChange={(val) => {
                    const isRec = val !== "false"
                    field.onChange(isRec)
                    if (isRec) {
                      form.setValue("recurrence_rule", `FREQ=${val.toUpperCase()};INTERVAL=1`)
                    } else {
                      form.setValue("recurrence_rule", null)
                    }
                  }} 
                  defaultValue={field.value ? "daily" : "false"}
                >
                  <FormControl>
                    <SelectTrigger className="h-8 text-xs w-[110px]">
                      <SelectValue placeholder="No repite" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="false">No repite</SelectItem>
                    <SelectItem value="daily">Diario</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensual</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Project Selector */}
          <FormField
            control={form.control}
            name="project_id"
            render={({ field }) => (
              <FormItem>
                <Select onValueChange={field.onChange} defaultValue={field.value || "none"}>
                  <FormControl>
                    <SelectTrigger className="h-8 text-xs w-[140px]">
                      <SelectValue placeholder="Proyecto (Opcional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Sin proyecto</SelectItem>
                    {/* Ideally inject dynamic projects here via tRPC query. Keeping static placeholder structure for UI validation */}
                    <SelectItem value="11111111-1111-1111-1111-111111111111" disabled>Cargando proyectos...</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="pt-4 flex justify-end">
          <Button type="submit" size="sm" disabled={createMutation.isPending} className="bg-[#2282fa] hover:bg-[#2282fa]/90 text-white">
            <Plus className="mr-2 h-4 w-4" />
            {createMutation.isPending ? "Guardando..." : "Crear"}
          </Button>
        </div>
      </form>
    </Form>
  )
}

