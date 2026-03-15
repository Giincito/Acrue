import { z } from 'zod';

export const CreateReminderSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional().nullable(),
  trigger_at: z.string().datetime(),
  is_completed: z.boolean().default(false).optional(),
});

export const UpdateReminderSchema = CreateReminderSchema.partial().extend({
  id: z.string().uuid(),
});

export type CreateReminderInput = z.infer<typeof CreateReminderSchema>;
export type UpdateReminderInput = z.infer<typeof UpdateReminderSchema>;
