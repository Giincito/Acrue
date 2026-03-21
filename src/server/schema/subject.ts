import { z } from "zod";

export const CreateSubjectSchema = z.object({
  name: z.string().min(1, "El nombre de la materia es requerido"),
  code: z.string().optional().nullable(),
  credits: z.number().int().min(0).default(0),
  status: z.enum(["active", "pending", "completed"]).default("pending"),
  target_grade: z.number().min(0).max(10).optional().nullable(),
  prerequisites: z.array(z.string().uuid()).optional().default([]),
  weekly_hours: z.number().int().min(0).optional().nullable(),
  enrollment_open_date: z.date().optional().nullable(),
});

export const UpdateSubjectSchema = CreateSubjectSchema.partial().extend({
  id: z.string().uuid(),
  final_grade: z.number().min(0).max(10).optional().nullable(),
});

export type CreateSubjectInput = z.infer<typeof CreateSubjectSchema>;
export type UpdateSubjectInput = z.infer<typeof UpdateSubjectSchema>;
