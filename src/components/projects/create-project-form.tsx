"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { trpc } from "@/lib/trpc"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { CreateProjectSchema, type CreateProjectInput } from "@/server/schema/project"
import { Plus, CalendarIcon, Palette, Smile } from "lucide-react"

interface CreateProjectFormProps {
  onSuccess?: () => void
}

const PROJECT_PALETTE = [
  "#2282fa", // Blue (Accent)
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#a855f7", // Purple
  "#ec4899", // Pink
  "#64748b", // Slate
]

export function CreateProjectForm({ onSuccess }: CreateProjectFormProps) {
  const trpcContext = trpc.useUtils()
  const createMutation = trpc.projects.create.useMutation({
    onSuccess: () => {
      trpcContext.projects.list.invalidate()
    }
  })
  
  const form = useForm<CreateProjectInput>({
    resolver: zodResolver(CreateProjectSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      status: "active",
      color: PROJECT_PALETTE[0],
      due_at: null,
    },
  })

  const onSubmit = async (values: CreateProjectInput) => {
    try {
      await createMutation.mutateAsync(values)
      form.reset()
      onSuccess?.()
      toast.success("Proyecto creado con éxito")
    } catch (e: any) {
      console.error("Failed to create project", e)
      toast.error(e.message || "Error al crear proyecto")
    }
  }

  const onError = (errors: any) => {
    console.error("Form validation errors:", errors)
    toast.error("Revisa los campos del formulario")
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-4 px-1">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input placeholder="Nombre del proyecto..." {...field} className="text-lg bg-transparent border-none shadow-none focus-visible:ring-0 px-2 h-auto font-medium" autoFocus />
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
                <Input placeholder="Descripción (opcional)..." {...field} value={field.value || ""} className="text-sm bg-transparent border-none shadow-none focus-visible:ring-0 px-2 h-auto" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex gap-4">
          <FormField
            control={form.control}
            name="icon"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <div className="relative">
                    <Smile className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Ícono (ej: 🚀)" {...field} value={field.value || ""} className="pl-8 text-sm" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem className="flex-none">
                <FormControl>
                  <Popover>
                    {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                    {/* @ts-expect-error - PopoverTrigger asChild typing conflict with base-ui */}
                    <PopoverTrigger asChild>
                      <button type="button" className="flex items-center justify-center w-10 h-10 rounded-md border cursor-pointer hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors relative" style={{ backgroundColor: field.value ? `${field.value}15` : 'transparent' }}>
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: field.value || PROJECT_PALETTE[0] }} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[180px] p-3" align="center">
                      <div className="grid grid-cols-4 gap-2">
                        {PROJECT_PALETTE.map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={cn(
                              "w-8 h-8 rounded-full border border-black/10 transition-transform hover:scale-110",
                              field.value === c && "ring-2 ring-offset-2 ring-accent"
                            )}
                            style={{ backgroundColor: c }}
                            onClick={() => field.onChange(c)}
                          />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="due_at"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <Popover>
                {/* @ts-expect-error - PopoverTrigger asChild typing conflict with base-ui */}
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full pl-3 text-left font-normal h-10",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    {field.value ? (
                      format(new Date(field.value), "PPP", { locale: es })
                    ) : (
                      <span>Fecha límite (opcional)</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
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

        <div className="pt-4 flex justify-end">
          <Button type="submit" size="sm" disabled={createMutation.isPending} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Plus className="mr-2 h-4 w-4" />
            {createMutation.isPending ? "Guardando..." : "Crear proyecto"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
