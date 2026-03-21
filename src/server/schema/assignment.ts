import { z } from "zod";

export const CreateAssignmentSchema = z.object({
  subject_id: z.string().uuid(),
  title: z.string().min(1, "El título es requerido"),
  type: z.enum(["exam", "homework", "project", "other"]).default("exam"),
  weight: z.number().min(0).max(100).optional().nullable(), // Weight as percentage 0-100 or fraction 0-1
  grade: z.number().min(0).max(10).optional().nullable(),
  due_at: z.date().optional().nullable(),
  completed: z.boolean().default(false),
});

export const UpdateAssignmentSchema = CreateAssignmentSchema.partial().extend({
  id: z.string().uuid(),
});

export type CreateAssignmentInput = z.infer<typeof CreateAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof UpdateAssignmentSchema>;
