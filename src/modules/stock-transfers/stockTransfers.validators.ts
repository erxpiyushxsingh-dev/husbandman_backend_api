import { z } from "zod";

export const createStockTransferSchema = z.object({
  transferNo: z.string().trim().min(1).max(60),
  item: z.string().trim().min(1).max(200),
  from: z.string().trim().min(1).max(150),
  to: z.string().trim().min(1).max(150),
  qty: z.string().trim().min(1).max(50),
  status: z.enum(["in-transit", "delivered", "delayed"]).default("in-transit"),
});

export const updateStockTransferSchema = z.object({
  status: z.enum(["in-transit", "delivered", "delayed"]).optional(),
  qty: z.string().trim().min(1).max(50).optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid("Invalid id") });
