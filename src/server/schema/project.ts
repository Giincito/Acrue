import { z } from 'zod';

export const ProjectStatusSchema = z.enum(["planned", "active", "completed", "archived"]);

export const CreateProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional().nullable(),
  status: ProjectStatusSchema.default("active"),
  color: z.string().max(20).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  due_at: z.string().datetime().optional().nullable(),
});

export const UpdateProjectSchema = CreateProjectSchema.partial().extend({
  id: z.string().uuid(),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;
