"use client"

import * as React from "react"
import { useForm, useWatch, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { trpc } from "@/lib/trpc"
import { useTaskStore } from "@/store/useTaskStore"
import { toast } from "sonner"
import {
  createIndexedDbOfflineActionStore,
  enqueueOfflineAction,
  OFFLINE_ACTION_QUEUED_EVENT,
} from "@/lib/pwa/offline-actions"

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
import { IconPicker } from "@/components/ui/icon-picker"
import { CalendarIcon, Plus } from "lucide-react"

const priorityMap: Record<string, string> = { "1": "Alta (1)", "2": "Media (2)", "3": "Baja (3)" }
const contextMap: Record<string, string> = { "ninguno": "Sin contexto", "@hogar": "@hogar", "@universidad": "@universidad", "@personal": "@personal", "@compras": "@compras", "@trabajo": "@trabajo" }
const uniMap: Record<string, string> = { "ninguno": "Sin especificar", "examen": "Examen", "tarea": "Tarea", "estudio": "Estudio", "repaso": "Repaso", "lectura": "Lectura", "compra": "Compra", "tramite": "Trámite" }
const recMap: Record<string, string> = { "no": "No repite", "daily": "Diario", "weekly": "Semanal", "monthly": "Mensual" }

const CREATE_TASK_TITLE_ROW_CLASS = "grid grid-cols-[44px_minmax(0,1fr)] items-center gap-2"
const CREATE_TASK_TITLE_INPUT_CLASS =
  "h-11 min-h-11 rounded-lg border-0 bg-muted/35 px-3 py-2 text-base font-medium shadow-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40"
const CREATE_TASK_CHIP_GRID_CLASS = "grid grid-cols-[repeat(auto-fit,minmax(132px,1fr))] gap-2"
const CREATE_TASK_CHIP_TRIGGER_CLASS =
  "h-11 min-h-11 w-full justify-between rounded-lg border-border/70 bg-card px-3 py-2 text-sm font-medium shadow-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/40 cursor-pointer"
const CREATE_TASK_CHIP_BUTTON_CLASS =
  "h-11 min-h-11 w-full justify-start rounded-lg border-border/70 bg-card px-3 py-2 text-sm font-medium shadow-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/40 cursor-pointer"

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
    resolver: zodResolver(CreateTaskSchema) as Resolver<CreateTaskInput>,
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
  const contextTag = useWatch({ control: form.control, name: "context_tag" })
  const recurrenceRule = useWatch({ control: form.control, name: "recurrence_rule" })

  const addOptimisticTask = (values: CreateTaskInput) => {
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
  }

  const queueOfflineTask = async (values: CreateTaskInput) => {
    await enqueueOfflineAction(
      createIndexedDbOfflineActionStore(),
      "tasks.create",
      values as Record<string, unknown>
    )
    addOptimisticTask(values)
    form.reset()
    onSuccess?.()
    window.dispatchEvent(new Event(OFFLINE_ACTION_QUEUED_EVENT))
    toast.info("Tarea guardada offline", {
      description: "Se sincroniza cuando vuelva la conexión.",
    })
  }

  const onSubmit = async (values: CreateTaskInput) => {
    if (!navigator.onLine) {
      await queueOfflineTask(values)
      return
    }

    try {
      addOptimisticTask(values)
      form.reset()
      onSuccess?.()
      await createMutation.mutateAsync(values)
    } catch {
      if (!navigator.onLine) {
        await queueOfflineTask(values)
        return
      }

      toast.error("No se pudo crear la tarea", {
        description: "Revisa la conexión e intenta de nuevo.",
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className={CREATE_TASK_TITLE_ROW_CLASS}>
          <FormField
            control={form.control}
            name="icon"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <IconPicker value={field.value} onChange={field.onChange} disabled={createMutation.isPending} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="min-w-0">
                <FormControl>
                  <Input placeholder="Ej: Pagar la luz..." {...field} className={CREATE_TASK_TITLE_INPUT_CLASS} autoFocus />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className={CREATE_TASK_CHIP_GRID_CLASS}>
          {/* Default due_at popover */}
          <FormField
            control={form.control}
            name="due_at"
            render={({ field }) => (
              <FormItem className="min-w-0 space-y-0">
                <FormControl>
                  <Popover>
                    <PopoverTrigger render={
                      <Button
                        type="button"
                        variant={"outline"}
                        className={cn(
                          CREATE_TASK_CHIP_BUTTON_CLASS,
                          !field.value && "text-muted-foreground border-dashed"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                        <span className="truncate">
                          {field.value ? format(new Date(field.value), "PPP", { locale: es }) : "Fecha"}
                        </span>
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
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem className="min-w-0 space-y-0">
                <Select onValueChange={(v) => field.onChange(parseInt(v || "2", 10))} value={field.value?.toString() || "2"}>
                  <FormControl>
                    <SelectTrigger className={CREATE_TASK_CHIP_TRIGGER_CLASS}>
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
              <FormItem className="min-w-0 space-y-0">
                <Select onValueChange={(v) => field.onChange(v === "ninguno" ? null : v)} value={field.value || "ninguno"}>
                  <FormControl>
                    <SelectTrigger className={CREATE_TASK_CHIP_TRIGGER_CLASS}>
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
          {contextTag === "@universidad" && (
            <FormField
              control={form.control}
              name="university_type"
              render={({ field }) => (
                <FormItem className="min-w-0 space-y-0">
                  <Select onValueChange={(v) => field.onChange(v === "ninguno" ? null : v)} value={field.value || "ninguno"}>
                    <FormControl>
                      <SelectTrigger className={cn(CREATE_TASK_CHIP_TRIGGER_CLASS, "capitalize")}>
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
              <FormItem className="min-w-0 space-y-0">
                {(() => {
                  const recurrenceValue = !field.value
                    ? "no"
                    : recurrenceRule?.includes("WEEKLY")
                      ? "weekly"
                      : recurrenceRule?.includes("MONTHLY")
                        ? "monthly"
                        : "daily"

                  return (
                  <Select 
                    onValueChange={(val) => {
                      const isRec = val != null && val !== "no"
                      field.onChange(isRec)
                      if (val === "daily") form.setValue("recurrence_rule", "FREQ=DAILY;INTERVAL=1")
                      else if (val === "weekly") form.setValue("recurrence_rule", "FREQ=WEEKLY;INTERVAL=1")
                      else if (val === "monthly") form.setValue("recurrence_rule", "FREQ=MONTHLY;INTERVAL=1")
                      else form.setValue("recurrence_rule", null)
                    }} 
                    value={recurrenceValue}
                  >
                  <FormControl>
                    <SelectTrigger className={cn(CREATE_TASK_CHIP_TRIGGER_CLASS, "capitalize")}>
                      <SelectValue placeholder="No repite">
                         {recMap[recurrenceValue]}
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
                  )
                })()}
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Project Selector */}
          <FormField
            control={form.control}
            name="project_id"
            render={({ field }) => (
              <FormItem className="min-w-0 space-y-0">
                <Select onValueChange={(v) => field.onChange(v === "ninguno" ? null : v)} value={field.value || "ninguno"}>
                  <FormControl>
                    <SelectTrigger className={CREATE_TASK_CHIP_TRIGGER_CLASS}>
                      <SelectValue placeholder="Proyecto (opcional)">
                        {field.value && field.value !== "ninguno" && projects?.find(p => p.id === field.value) ? (
                          <div className="flex min-w-0 items-center gap-2">
                            {projects.find(p => p.id === field.value)?.icon ? (
                              <span>{projects.find(p => p.id === field.value)?.icon}</span>
                            ) : (
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: projects.find(p => p.id === field.value)?.color || 'var(--accent)' }} />
                            )}
                            <span className="truncate">{projects.find(p => p.id === field.value)?.name}</span>
                          </div>
                        ) : field.value && field.value !== "ninguno" ? (
                          "Cargando..."
                        ) : (
                          "Proyecto (opcional)"
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

        <div className="flex justify-end pt-5">
          <Button type="submit" disabled={createMutation.isPending} className="h-11 min-h-11 bg-accent px-5 text-accent-foreground hover:bg-accent/90 cursor-pointer">
            <Plus className="mr-2 h-4 w-4" />
            {createMutation.isPending ? "Guardando..." : "Crear"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
