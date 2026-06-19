import { z } from 'zod';

export const TaskStatusSchema = z.enum(["inbox", "today", "upcoming", "someday", "completed", "trash"]);

/**
 * Base schema without defaults for use in Updates and Type inference
 */
const BaseTaskFields = {
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional().nullable(),
  context_tag: z.string().optional().nullable(),
  status: TaskStatusSchema,
  priority: z.number().int().min(1).max(3), // 1 = High, 2 = Medium, 3 = Low
  due_at: z.string().datetime().optional().nullable(),
  start_time: z.string().optional().nullable(),
  end_time: z.string().optional().nullable(),
  is_all_day: z.boolean(),
  project_id: z.string().uuid().optional().nullable(),
  is_recurring: z.boolean(),
  recurrence_rule: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  university_type: z.string().optional().nullable(),
  gcal_event_id: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
};

/**
 * Schema for creating a task with defaults
 */
export const CreateTaskSchema = z.object({
  ...BaseTaskFields,
  status: BaseTaskFields.status.default("inbox"),
  priority: BaseTaskFields.priority.default(2),
  is_all_day: BaseTaskFields.is_all_day.default(false),
  is_recurring: BaseTaskFields.is_recurring.default(false),
});

/**
 * Schema for updating a task - No defaults allowed here to prevent resetting existing values
 */
export const UpdateTaskSchema = z.object({
  ...BaseTaskFields,
  // Make everything optional for updates
  title: BaseTaskFields.title.optional(),
  status: BaseTaskFields.status.optional(),
  priority: BaseTaskFields.priority.optional(),
  is_all_day: BaseTaskFields.is_all_day.optional(),
  is_recurring: BaseTaskFields.is_recurring.optional(),
}).partial().extend({
  id: z.string().uuid(),
  completed_at: z.string().datetime().optional().nullable(),
  deleted_at: z.string().datetime().optional().nullable(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
