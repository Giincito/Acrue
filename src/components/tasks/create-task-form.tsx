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
import { CreateTaskSchema, type CreateTaskInput, TaskStatus } from "@/server/schema/task"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { es } from "date-fns/locale/es"
import { cn } from "@/lib/utils"
import { PaintBucket, CalendarIcon, Plus } from "lucide-react"

const priorityMap: Record<string, string> = { "1": "Alta (1)", "2": "Media (2)", "3": "Baja (3)" }
const contextMap: Record<string, string> = { "ninguno": "Sin contexto", "@hogar": "@hogar", "@universidad": "@universidad", "@personal": "@personal", "@compras": "@compras", "@trabajo": "@trabajo" }
const uniMap: Record<string, string> = { "ninguno": "Sin especificar", "examen": "Examen", "tarea": "Tarea", "estudio": "Estudio", "repaso": "Repaso", "lectura": "Lectura", "compra": "Compra", "tramite": "Trámite" }
const recMap: Record<string, string> = { "no": "No repite", "daily": "Diario", "weekly": "Semanal", "monthly": "Mensual" }

interface CreateTaskFormProps {
  defaultStatus?: TaskStatus
  onSuccess?: () => void
}

export function CreateTaskForm({ defaultStatus = "inbox", onSuccess }: CreateTaskFormProps) {
  const { addTask } = useTaskStore()
  const utils = trpc.useUtils()
  const createMutation = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate()
    }
  })
  
  const { data: projects, isLoading: projectsLoading } = trpc.projects.list.useQuery()
  
  const form = useForm<CreateTaskInput>({
    resolver: zodResolver(CreateTaskSchema) as any,
    defaultValues: {
      title: "",
      context_tag: null,
      status: (defaultStatus as TaskStatus) || "inbox",
      priority: 2,
      due_at: null,
      start_time: null,
      end_time: null,
      is_all_day: false,
      project_id: null,
      is_recurring: false,
      recurrence_rule: null,
      color: null,
      university_type: null
    },
  })

  const onSubmit = async (values: CreateTaskInput) => {
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
        start_time: values.start_time || null,
        end_time: values.end_time || null,
        is_all_day: values.is_all_day || false,
        project_id: values.project_id || null,
        recurrence_rule: values.recurrence_rule || null,
        color: values.color || null,
        university_type: values.university_type || null
      })
      
      form.reset()
      onSuccess?.()
      
      // Submit to backend
      await createMutation.mutateAsync(values)
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
                <Input placeholder="Ej: Pagar la luz..." {...field} className="text-lg bg-transparent border-none shadow-none focus-visible:ring-0 pl-4 pr-2 h-auto font-medium" autoFocus />
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
                  <PopoverTrigger render={
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
                  } />
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) => {
                        field.onChange(date?.toISOString())
                        if (date) {
                          form.setValue("is_all_day", true)
                        } else {
                          form.setValue("is_all_day", false)
                        }
                      }}
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
                <Select onValueChange={(v) => field.onChange(parseInt(v || "2", 10))} value={field.value?.toString() || "2"}>
                  <FormControl>
                    <SelectTrigger className="h-8 text-xs w-[110px]">
                      <SelectValue placeholder="Prioridad">
                        {priorityMap[field.value?.toString() || "2"]}
                      </SelectValue>
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
                <Select onValueChange={(v) => field.onChange(v === "ninguno" ? null : v)} value={field.value || "ninguno"}>
                  <FormControl>
                    <SelectTrigger className="h-8 text-xs w-[110px]">
                      <SelectValue placeholder="Contexto">
                        {contextMap[field.value || "ninguno"]}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ninguno">Sin contexto</SelectItem>
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

          {/* Conditional University Type */}
          {form.watch("context_tag") === "@universidad" && (
            <FormField
              control={form.control}
              name="university_type"
              render={({ field }) => (
                <FormItem>
                  <Select onValueChange={(v) => field.onChange(v === "ninguno" ? null : v)} value={field.value || "ninguno"}>
                    <FormControl>
                      <SelectTrigger className="h-8 text-xs w-[120px] capitalize">
                        <SelectValue placeholder="Tipo de Asunto">
                          {uniMap[field.value || "ninguno"]}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ninguno">Sin especificar</SelectItem>
                      <SelectItem value="examen">Examen</SelectItem>
                      <SelectItem value="tarea">Tarea</SelectItem>
                      <SelectItem value="estudio">Estudio</SelectItem>
                      <SelectItem value="repaso">Repaso</SelectItem>
                      <SelectItem value="lectura">Lectura</SelectItem>
                      <SelectItem value="compra">Compra</SelectItem>
                      <SelectItem value="tramite">Trámite</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Basic Recurrence Switch */}
          <FormField
            control={form.control}
            name="is_recurring"
            render={({ field }) => (
              <FormItem>
                  <Select 
                    onValueChange={(val) => {
                      const isRec = val != null && val !== "no"
                      field.onChange(isRec)
                      if (val === "daily") form.setValue("recurrence_rule", "FREQ=DAILY;INTERVAL=1")
                      else if (val === "weekly") form.setValue("recurrence_rule", "FREQ=WEEKLY;INTERVAL=1")
                      else if (val === "monthly") form.setValue("recurrence_rule", "FREQ=MONTHLY;INTERVAL=1")
                      else form.setValue("recurrence_rule", null)
                    }} 
                    value={!field.value ? "no" : form.watch("recurrence_rule")?.includes("WEEKLY") ? "weekly" : form.watch("recurrence_rule")?.includes("MONTHLY") ? "monthly" : "daily"}
                  >
                  <FormControl>
                    <SelectTrigger className="h-8 text-xs w-[110px] capitalize">
                      <SelectValue placeholder="No repite">
                         {recMap[!field.value ? "no" : form.watch("recurrence_rule")?.includes("WEEKLY") ? "weekly" : form.watch("recurrence_rule")?.includes("MONTHLY") ? "monthly" : "daily"]}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="no">No repite</SelectItem>
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
                <Select onValueChange={(v) => field.onChange(v === "ninguno" ? null : v)} value={field.value || "ninguno"}>
                  <FormControl>
                    <SelectTrigger className="h-8 text-xs w-[140px]">
                      <SelectValue placeholder="Proyecto (Opcional)">
                        {field.value && field.value !== "ninguno" && projects?.find(p => p.id === field.value) ? (
                          <div className="flex items-center gap-2">
                            {projects.find(p => p.id === field.value)?.icon ? (
                              <span>{projects.find(p => p.id === field.value)?.icon}</span>
                            ) : (
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: projects.find(p => p.id === field.value)?.color || 'var(--accent)' }} />
                            )}
                            <span className="truncate max-w-[80px]">{projects.find(p => p.id === field.value)?.name}</span>
                          </div>
                        ) : field.value && field.value !== "ninguno" ? (
                          "Cargando..."
                        ) : (
                          "Proyecto (Opcional)"
                        )}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ninguno">Sin proyecto</SelectItem>
                    {projectsLoading ? (
                      <SelectItem value="loading" disabled>Cargando...</SelectItem>
                    ) : projects?.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || 'var(--accent)' }} />
                          {p.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="pt-4 flex justify-end">
          <Button type="submit" size="sm" disabled={createMutation.isPending} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Plus className="mr-2 h-4 w-4" />
            {createMutation.isPending ? "Guardando..." : "Crear"}
          </Button>
        </div>
      </form>
    </Form>
  )
}

