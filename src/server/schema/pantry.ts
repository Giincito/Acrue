import { z } from 'zod'

// ─── Pantry Items ───────────────────────────────────────────────────

const UnitEnum = z.enum(['g', 'kg', 'ml', 'l', 'unidades'])

export const CreatePantryItemSchema = z.object({
  name: z.string().min(1).max(100),
  quantity: z.number().min(0),
  unit: UnitEnum,
  min_stock: z.number().min(0).default(0),
})

export const UpdatePantryItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  quantity: z.number().min(0).optional(),
  unit: UnitEnum.optional(),
  min_stock: z.number().min(0).optional(),
})

export const UpdateQuantitySchema = z.object({
  id: z.string().uuid(),
  delta: z.number(), // positive = add, negative = subtract
})

// ─── Shopping List ──────────────────────────────────────────────────

export const ShoppingListFilterSchema = z.object({
  checked: z.boolean().optional(),
}).optional()

export const CreateShoppingListItemSchema = z.object({
  pantry_item_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(100),
  quantity: z.number().min(0).optional().nullable(),
  unit: z.string().optional().nullable(),
  auto_generated: z.boolean().default(false),
  note: z.string().optional().nullable(),
})

export const MarkCheckedSchema = z.object({
  id: z.string().uuid(),
  quantity_purchased: z.number().min(0).optional(),
})

// ─── Stores ─────────────────────────────────────────────────────────

export const CreateStoreSchema = z.object({
  name: z.string().min(1).max(100),
})

export const UpdateStoreSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
})

// ─── Store Prices ───────────────────────────────────────────────────

export const UpsertStorePriceSchema = z.object({
  store_id: z.string().uuid(),
  pantry_item_id: z.string().uuid(),
  price: z.number().min(0),
})
