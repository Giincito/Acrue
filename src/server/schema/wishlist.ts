import { z } from 'zod'

export const WishlistStatusSchema = z.enum(['wanted', 'saved', 'purchased'])

const nullableText = z.string().trim().max(500).optional().nullable()
const nullableUrl = z
  .string()
  .trim()
  .url('URL invalida')
  .optional()
  .nullable()

export const CreateWishlistItemSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido').max(160),
  description: nullableText,
  price: z.number().nonnegative().optional().nullable(),
  currency: z.string().trim().min(1).max(8).default('ARS'),
  store: nullableText,
  url: nullableUrl,
  priority: z.number().int().min(1).max(3).default(2),
  status: WishlistStatusSchema.default('wanted'),
})

export const UpdateWishlistItemSchema = CreateWishlistItemSchema.partial().extend({
  id: z.string().uuid(),
})

export const WishlistListInputSchema = z
  .object({
    status: WishlistStatusSchema.optional(),
  })
  .optional()

export const WishlistSuggestionInputSchema = z
  .object({
    year: z.number().int(),
    month: z.number().int().min(1).max(12),
  })
  .optional()

export type CreateWishlistItemInput = z.infer<typeof CreateWishlistItemSchema>
export type UpdateWishlistItemInput = z.infer<typeof UpdateWishlistItemSchema>
export type WishlistStatus = z.infer<typeof WishlistStatusSchema>
