import { z } from 'zod';

export const TaskStatusSchema = z.enum(["inbox", "today", "upcoming", "someday", "completed", "trash"]);

export const TaskPrioritySchema = z.number().int().min(1).max(3).default(2); // 1 = High, 2 = Medium, 3 = Low

export const CreateTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  context_tag: z.string().optional().nullable(),
  status: TaskStatusSchema.default("inbox"),
  priority: TaskPrioritySchema,
  due_at: z.string().datetime().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
  is_recurring: z.boolean().default(false),
  recurrence_rule: z.string().optional().nullable(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  id: z.string().uuid(),
  completed_at: z.string().datetime().optional().nullable(),
  deleted_at: z.string().datetime().optional().nullable(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
