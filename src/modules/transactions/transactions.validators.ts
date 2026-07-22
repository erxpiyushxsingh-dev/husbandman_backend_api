import { z } from "zod";

export const createTransactionSchema = z.object({
  invoiceNo: z.string().trim().min(1, "Invoice number is required").max(60),
  type: z.enum(["sale", "purchase"]),
  party: z.string().trim().min(1).max(200),
  partyType: z.enum(["farmer", "supplier"]),
  location: z.string().trim().max(150).optional(),
  items: z.string().trim().max(2000).optional(),
  branch: z.string().trim().max(150).optional(),
  paymentMethod: z.enum(["cash", "upi", "credit"]),
  status: z.enum(["paid", "pending", "overdue"]).default("pending"),
  amount: z.number().min(0),
  date: z.string().datetime().optional(),
  // Optional: if provided, a sale deducts this much stock / a purchase adds
  // it, atomically, from the given inventory item as part of the same request.
  inventoryItemId: z.string().uuid().optional(),
  quantity: z.number().positive().optional(),
});

export const updateTransactionSchema = z.object({
  status: z.enum(["paid", "pending", "overdue"]).optional(),
  paymentMethod: z.enum(["cash", "upi", "credit"]).optional(),
  amount: z.number().min(0).optional(),
  items: z.string().trim().max(2000).optional(),
  location: z.string().trim().max(150).optional(),
  branch: z.string().trim().max(150).optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid("Invalid id") });
