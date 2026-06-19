import { z } from 'zod'

// ─── Expenses ───────────────────────────────────────────────────────

export const CreateExpenseSchema = z.object({
  amount: z.number(),
  currency: z.string().default('ARS'),
  category_id: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  date: z.string(), // YYYY-MM-DD
  source: z.string().optional().nullable(),
})

export const UpdateExpenseSchema = z.object({
  id: z.string().uuid(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  category_id: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  date: z.string().optional(),
  source: z.string().optional().nullable(),
})

export const ExpenseFilterSchema = z.object({
  categoryId: z.string().uuid().optional(),
  dateFrom: z.string().optional(), // YYYY-MM-DD
  dateTo: z.string().optional(),
  amountMin: z.number().optional(),
  amountMax: z.number().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
}).optional()

// ─── Categories ─────────────────────────────────────────────────────

export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(50),
  icon: z.string().optional().nullable(),
})

export const UpdateCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50).optional(),
  icon: z.string().optional().nullable(),
})

// ─── Subscriptions ──────────────────────────────────────────────────

export const CreateSubscriptionSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().default('ARS'),
  renewal_date: z.string(), // YYYY-MM-DD
  active: z.boolean().default(true),
})

export const UpdateSubscriptionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().optional(),
  renewal_date: z.string().optional(),
  active: z.boolean().optional(),
})

// ─── Saving Goals ───────────────────────────────────────────────────

export const CreateSavingGoalSchema = z.object({
  name: z.string().min(1),
  target_amount: z.number().positive(),
  deadline: z.string().optional().nullable(), // YYYY-MM-DD
})

export const UpdateSavingGoalSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  target_amount: z.number().positive().optional(),
  deadline: z.string().optional().nullable(),
})

export const AddToGoalSchema = z.object({
  id: z.string().uuid(),
  amount: z.number().positive(),
})

// ─── Debts ──────────────────────────────────────────────────────────

export const DebtTypeSchema = z.enum(["owed_to_me", "i_owe"])
export const DebtStatusSchema = z.enum(["pending", "partial", "settled"])

export const CreateDebtSchema = z.object({
  name: z.string().min(1),
  person: z.string().min(1),
  type: DebtTypeSchema,
  total_amount: z.number().positive(),
  currency: z.string().default("ARS"),
  due_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const UpdateDebtSchema = z.object({
  id: z.string().uuid(),
  name: z.string().optional(),
  person: z.string().optional(),
  type: DebtTypeSchema.optional(),
  total_amount: z.number().positive().optional(),
  currency: z.string().optional(),
  due_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const AddDebtPaymentSchema = z.object({
  id: z.string().uuid(),
  amount: z.number().positive(),
})

export const SettleDebtSchema = z.object({
  id: z.string().uuid(),
})
