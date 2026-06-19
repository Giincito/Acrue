"use client"

import * as React from "react"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, Plus } from "lucide-react"
import { toast } from "sonner"
import { trpc } from "@/lib/trpc"
import { cn } from "@/lib/utils"
import { CreateAssignmentSchema, type AssignmentType, type CreateAssignmentInput } from "@/server/schema/assignment"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface AssignmentFormProps {
  subjectId: string
  onSuccess?: () => void
}

const TYPE_LABELS: Record<AssignmentType, string> = {
  tp: "Trabajo práctico",
  parcial: "Parcial",
  final: "Final",
  quiz: "Quiz",
  proyecto: "Proyecto",
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

export function AssignmentForm({ subjectId, onSuccess }: AssignmentFormProps) {
  const utils = trpc.useUtils()
  const createMutation = trpc.assignments.create.useMutation({
    onSuccess: () => {
      utils.assignments.listBySubject.invalidate({ subject_id: subjectId })
      utils.subjects.list.invalidate()
      utils.subjects.getById.invalidate({ id: subjectId })
    },
  })

  const form = useForm<CreateAssignmentInput>({
    resolver: zodResolver(CreateAssignmentSchema) as Resolver<CreateAssignmentInput>,
    defaultValues: {
      subject_id: subjectId,
      title: "",
      type: "parcial",
      weight: null,
      grade: null,
      due_at: null,
      completed: false,
    },
  })

  const onSubmit = async (values: CreateAssignmentInput) => {
    try {
      await createMutation.mutateAsync({ ...values, subject_id: subjectId })
      form.reset()
      onSuccess?.()
      toast.success("Evaluación agregada")
    } catch (error) {
      toast.error(getErrorMessage(error, "No se pudo agregar la evaluación"))
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
              <FormLabel>Título *</FormLabel>
              <FormControl>
                <Input placeholder="Ej: primer parcial" {...field} autoFocus />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val} className="cursor-pointer">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Peso (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="Ej: 40"
                    value={field.value ?? ""}
                    onChange={(event) => field.onChange(event.target.value ? Number(event.target.value) : null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="grade"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nota (0-10)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    placeholder="-"
                    value={field.value ?? ""}
                    onChange={(event) => field.onChange(event.target.value ? Number(event.target.value) : null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="due_at"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha</FormLabel>
                <Popover>
                  <PopoverTrigger render={
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal h-10 cursor-pointer",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? format(new Date(field.value), "PPP", { locale: es }) : "Seleccionar"}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  } />
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) => field.onChange(date?.toISOString() ?? null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="pt-4 flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={createMutation.isPending}
            className="bg-accent hover:bg-accent/90 text-accent-foreground cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" />
            {createMutation.isPending ? "Guardando..." : "Agregar evaluación"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
