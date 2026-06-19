import { z } from "zod";

export const SubjectStatusSchema = z.enum(["pending", "in_progress", "approved", "failed"]);

export const SubjectScheduleSchema = z.object({
  day: z.enum(["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]),
  start: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Formato inválido (HH:mm)"),
  end: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Formato inválido (HH:mm)"),
  room: z.string().optional().nullable(),
});

export const CreateSubjectSchema = z.object({
  name: z.string().min(1, "El nombre de la materia es requerido"),
  code: z.string().optional().nullable(),
  commission: z.string().optional().nullable(),
  status: SubjectStatusSchema.default("pending"),
  target_grade: z.number().min(0).max(10).optional().nullable(),
  prerequisites: z.array(z.string().uuid()).optional().default([]),
  weekly_hours: z.number().int().min(0).optional().nullable(),
  enrollment_open_date: z.string().datetime().optional().nullable(),
  schedules: z.array(SubjectScheduleSchema).optional().default([]),
});

export const UpdateSubjectSchema = CreateSubjectSchema.partial().extend({
  id: z.string().uuid(),
  final_grade: z.number().min(0).max(10).optional().nullable(),
});

export type CreateSubjectInput = z.infer<typeof CreateSubjectSchema>;
export type UpdateSubjectInput = z.infer<typeof UpdateSubjectSchema>;
export type SubjectStatus = z.infer<typeof SubjectStatusSchema>;
