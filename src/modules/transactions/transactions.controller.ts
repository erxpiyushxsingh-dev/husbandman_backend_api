import type { Request, Response } from "express";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { sendSuccess } from "../../common/utils/ApiResponse";
import { transactionsService } from "./transactions.service";

export const transactionsController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const result = await transactionsService.list(req.user?.tenantId ?? null, { page, limit });
    sendSuccess(res, result, "Transactions fetched");
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const item = await transactionsService.getById(req.params.id, req.user?.tenantId ?? null);
    sendSuccess(res, { item }, "Transaction fetched");
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const item = await transactionsService.create(req.body, req.user?.tenantId ?? null);
    sendSuccess(res, { item }, "Transaction created", 201);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const item = await transactionsService.update(req.params.id, req.body, req.user?.tenantId ?? null);
    sendSuccess(res, { item }, "Transaction updated");
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await transactionsService.remove(req.params.id, req.user?.tenantId ?? null);
    sendSuccess(res, null, "Transaction deleted");
  }),
};
