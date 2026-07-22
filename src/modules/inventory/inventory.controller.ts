import type { Request, Response } from "express";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { sendSuccess } from "../../common/utils/ApiResponse";
import { inventoryService } from "./inventory.service";

export const inventoryController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const result = await inventoryService.list(req.user?.tenantId ?? null, { page, limit });
    sendSuccess(res, result, "Inventory list fetched");
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const item = await inventoryService.getById(req.params.id, req.user?.tenantId ?? null);
    sendSuccess(res, { item }, "Inventory item fetched");
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const item = await inventoryService.create(req.body, req.user?.tenantId ?? null);
    sendSuccess(res, { item }, "Inventory item created", 201);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const item = await inventoryService.update(req.params.id, req.body, req.user?.tenantId ?? null);
    sendSuccess(res, { item }, "Inventory item updated");
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await inventoryService.remove(req.params.id, req.user?.tenantId ?? null);
    sendSuccess(res, null, "Inventory item deleted");
  }),

  adjustStock: asyncHandler(async (req: Request, res: Response) => {
    const item = await inventoryService.adjustStock(req.params.id, req.user?.tenantId ?? null, req.body.delta);
    sendSuccess(res, { item }, "Stock adjusted");
  }),
};
