import { z } from "zod";

export const createInventorySchema = z.object({
  sku: z.string().trim().min(1, "SKU is required").max(60),
  name: z.string().trim().min(1, "Name is required").max(200),
  categoryId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  stock: z.number().min(0).default(0),
  unit: z.string().trim().max(30).default("unit"),
  unitPrice: z.number().min(0).default(0),
  // stockStatus is intentionally NOT accepted from clients — it's derived
  // server-side from `stock` so it can never drift out of sync (see service).
});

export const updateInventorySchema = createInventorySchema.partial();

export const adjustStockSchema = z.object({
  // Positive to add stock, negative to deduct (e.g. from a sale).
  delta: z.number().refine((v) => v !== 0, "delta must be non-zero"),
  reason: z.string().trim().max(255).optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid("Invalid id") });
