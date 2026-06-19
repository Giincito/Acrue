import { z } from "zod";

export const AssignmentTypeSchema = z.enum(["tp", "parcial", "final", "quiz", "proyecto"]);

export const CreateAssignmentSchema = z.object({
  subject_id: z.string().uuid(),
  title: z.string().min(1, "El título es requerido"),
  type: AssignmentTypeSchema.default("parcial"),
  weight: z.number().min(0).max(100).optional().nullable(),
  grade: z.number().min(0).max(10).optional().nullable(),
  due_at: z.string().datetime().optional().nullable(),
  completed: z.boolean().default(false),
});

export const UpdateAssignmentSchema = CreateAssignmentSchema.partial().extend({
  id: z.string().uuid(),
});

export type CreateAssignmentInput = z.infer<typeof CreateAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof UpdateAssignmentSchema>;
export type AssignmentType = z.infer<typeof AssignmentTypeSchema>;
