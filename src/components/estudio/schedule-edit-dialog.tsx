"use client"

import * as React from "react"
import { trpc } from "@/lib/trpc"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, Calendar, Loader2, Clock } from "lucide-react"
import { toast } from "sonner"
import type { SubjectStatus, UpdateSubjectInput } from "@/server/schema/subject"

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

interface ScheduleSession {
  day: string
  start: string
  end: string
  room?: string | null
}

interface ScheduleSubject {
  id: string
  name: string
  status: SubjectStatus
  schedules?: ScheduleSession[] | null
}

export function ScheduleEditDialog() {
  const [open, setOpen] = React.useState(false)
  const utils = trpc.useUtils()
  const { data: subjects, isLoading } = trpc.subjects.list.useQuery()
  const updateMutation = trpc.subjects.update.useMutation()

  const activeSubjects = React.useMemo(
    () =>
      ((subjects ?? []) as ScheduleSubject[]).filter(
        (subject) => subject.status === "in_progress" || subject.status === "pending"
      ),
    [subjects]
  )
  
  // Local state for editing schedules
  const [localSchedules, setLocalSchedules] = React.useState<Record<string, ScheduleSession[]>>({})

  // Initialize local state when subjects load or dialog opens
  React.useEffect(() => {
    if (open) {
      const initial: Record<string, ScheduleSession[]> = {}
      activeSubjects.forEach((subject) => {
        initial[subject.id] = subject.schedules ?? []
      })
      setLocalSchedules(initial)
    }
  }, [activeSubjects, open])

  const addSession = (subjectId: string) => {
    setLocalSchedules(prev => ({
      ...prev,
      [subjectId]: [
        ...(prev[subjectId] || []),
        { day: "Lun", start: "08:00", end: "10:00", room: "" }
      ]
    }))
  }

  const removeSession = (subjectId: string, index: number) => {
    setLocalSchedules(prev => ({
      ...prev,
      [subjectId]: prev[subjectId].filter((_, i) => i !== index)
    }))
  }

  const updateSession = (subjectId: string, index: number, field: keyof ScheduleSession, value: string | null) => {
    setLocalSchedules(prev => {
      const updated = [...prev[subjectId]]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, [subjectId]: updated }
    })
  }

  const handleSave = async () => {
    try {
      const promises = Object.entries(localSchedules).map(([id, schedules]) => {
        const schedulesPayload = schedules as NonNullable<UpdateSubjectInput["schedules"]>
        return updateMutation.mutateAsync({
          id,
          schedules: schedulesPayload,
        })
      })

      await Promise.all(promises)
      toast.success("Horarios actualizados correctamente")
      utils.subjects.list.invalidate()
      setOpen(false)
    } catch {
      toast.error("Error al guardar los horarios")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="outline" size="sm" className="cursor-pointer">
          <Calendar className="w-4 h-4 mr-2" />
          Editar horarios
        </Button>
      } />
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b">
          <DialogTitle>Gestionar sesiones de clase</DialogTitle>
          <p className="text-sm text-muted-foreground">Define los días y horas específicos para cada materia que estás cursando actualmente.</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
          ) : activeSubjects.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">No tienes materias en curso.</p>
          ) : (
            activeSubjects.map(subject => (
              <div key={subject.id} className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="font-medium text-sm flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    {subject.name}
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => addSession(subject.id)} className="h-8 px-2 text-xs cursor-pointer">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Añadir sesión
                  </Button>
                </div>

                <div className="space-y-2">
                  {(localSchedules[subject.id] || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground italic pl-4">Sin sesiones manuales (usando autocalculado)</p>
                  ) : (
                    (localSchedules[subject.id] || []).map((session, idx) => (
                      <div key={idx} className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                        <Select
                          value={session.day}
                          onValueChange={(val) => updateSession(subject.id, idx, "day", val)}
                        >
                          <SelectTrigger className="w-[100px] h-9 text-xs cursor-pointer">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DAYS.map(d => <SelectItem key={d} value={d} className="text-xs cursor-pointer">{d}</SelectItem>)}
                          </SelectContent>
                        </Select>

                        <div className="flex items-center gap-1 bg-muted/30 rounded-md px-2 py-1 ring-1 ring-inset ring-black/5">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <input
                            type="text"
                            value={session.start}
                            onChange={(e) => updateSession(subject.id, idx, "start", e.target.value)}
                            placeholder="08:00"
                            className="bg-transparent border-none text-xs w-12 text-center p-0 focus:ring-0"
                          />
                          <span className="text-muted-foreground"> - </span>
                          <input
                            type="text"
                            value={session.end}
                            onChange={(e) => updateSession(subject.id, idx, "end", e.target.value)}
                            placeholder="10:00"
                            className="bg-transparent border-none text-xs w-12 text-center p-0 focus:ring-0"
                          />
                        </div>

                        <Input
                          placeholder="Aula (opcional)"
                          value={session.room || ""}
                          onChange={(e) => updateSession(subject.id, idx, "room", e.target.value)}
                          className="h-9 text-xs flex-1"
                        />

                        <Button 
                          variant="ghost" 
                          size="icon" 
                          aria-label="Eliminar horario"
                          onClick={() => removeSession(subject.id, idx)}
                          className="h-9 w-9 text-muted-foreground hover:text-destructive cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="p-6 border-t bg-muted/20">
          <Button variant="outline" onClick={() => setOpen(false)} className="cursor-pointer">Cancelar</Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-accent hover:bg-accent/90 text-accent-foreground cursor-pointer">
            {updateMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : null}
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
