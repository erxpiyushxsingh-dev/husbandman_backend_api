import type { Request, Response } from "express";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { sendSuccess } from "../../common/utils/ApiResponse";
import { stockTransfersService } from "./stockTransfers.service";

export const stockTransfersController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const result = await stockTransfersService.list(req.user?.tenantId ?? null, { page, limit });
    sendSuccess(res, result, "Stock transfers fetched");
  }),
  getById: asyncHandler(async (req: Request, res: Response) => {
    const item = await stockTransfersService.getById(req.params.id, req.user?.tenantId ?? null);
    sendSuccess(res, { item }, "Stock transfer fetched");
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    const item = await stockTransfersService.create(req.body, req.user?.tenantId ?? null);
    sendSuccess(res, { item }, "Stock transfer created", 201);
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    const item = await stockTransfersService.update(req.params.id, req.body, req.user?.tenantId ?? null);
    sendSuccess(res, { item }, "Stock transfer updated");
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await stockTransfersService.remove(req.params.id, req.user?.tenantId ?? null);
    sendSuccess(res, null, "Stock transfer deleted");
  }),
};
