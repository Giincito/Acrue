"use client"

import * as React from "react"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { trpc } from "@/lib/trpc"
import { CreateSubjectSchema, type CreateSubjectInput, type SubjectStatus, type UpdateSubjectInput } from "@/server/schema/subject"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface EditableSubject {
  id: string
  name: string
  code: string | null
  commission: string | null
  status: SubjectStatus
  target_grade: number | null
  weekly_hours: number | null
  prerequisites?: string[] | null
}

interface SubjectFormProps {
  initialData?: EditableSubject
  onSuccess?: () => void
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

export function SubjectForm({ onSuccess, initialData }: SubjectFormProps) {
  const utils = trpc.useUtils()
  const createMutation = trpc.subjects.create.useMutation({
    onSuccess: () => {
      utils.subjects.list.invalidate()
    },
  })

  const updateMutation = trpc.subjects.update.useMutation({
    onSuccess: (data) => {
      utils.subjects.list.invalidate()
      utils.subjects.getById.invalidate({ id: data.id })
    },
  })

  const form = useForm<CreateSubjectInput>({
    resolver: zodResolver(CreateSubjectSchema) as Resolver<CreateSubjectInput>,
    defaultValues: initialData
      ? {
          name: initialData.name,
          code: initialData.code,
          commission: initialData.commission,
          status: initialData.status,
          target_grade: initialData.target_grade,
          weekly_hours: initialData.weekly_hours,
          prerequisites: initialData.prerequisites ?? [],
        }
      : {
          name: "",
          code: "",
          commission: "",
          status: "pending",
          target_grade: null,
          weekly_hours: null,
          prerequisites: [],
        },
  })

  const onSubmit = async (values: CreateSubjectInput) => {
    try {
      if (initialData) {
        const updatePayload: UpdateSubjectInput = {
          id: initialData.id,
          ...values,
        }
        await updateMutation.mutateAsync(updatePayload)
        toast.success("Materia actualizada")
      } else {
        await createMutation.mutateAsync(values)
        toast.success("Materia agregada")
      }
      form.reset()
      onSuccess?.()
    } catch (error) {
      toast.error(getErrorMessage(error, "Error al procesar la materia"))
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la materia *</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Algoritmos y Estructuras de Datos" {...field} autoFocus />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: AED101" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="commission"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Comisión</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ej: A, 1, 102"
                    {...field}
                    value={field.value ?? ""}
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
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pending" className="cursor-pointer">Pendiente</SelectItem>
                    <SelectItem value="in_progress" className="cursor-pointer">Cursando</SelectItem>
                    <SelectItem value="approved" className="cursor-pointer">Aprobada</SelectItem>
                    <SelectItem value="failed" className="cursor-pointer">Desaprobada</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="target_grade"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nota objetivo</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    placeholder="Ej: 7"
                    value={field.value ?? ""}
                    onChange={(event) => field.onChange(event.target.value ? Number(event.target.value) : null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="weekly_hours"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Horas semanales</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  placeholder="Ej: 6"
                  value={field.value ?? ""}
                  onChange={(event) => field.onChange(event.target.value ? Number(event.target.value) : null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="pt-4 flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="bg-accent hover:bg-accent/90 text-accent-foreground cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" />
            {createMutation.isPending || updateMutation.isPending
              ? "Guardando..."
              : initialData
                ? "Actualizar materia"
                : "Agregar materia"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
