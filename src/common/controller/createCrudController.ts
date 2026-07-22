import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

interface CrudService<T> {
  list: (tenantId: string | null, pagination: { page: number; limit: number }) => Promise<{ items: T[]; total: number; page: number; limit: number }>;
  getById: (id: string, tenantId: string | null) => Promise<T>;
  create: (data: Record<string, unknown>, tenantId: string | null) => Promise<T>;
  update: (id: string, data: Record<string, unknown>, tenantId: string | null) => Promise<T>;
  remove: (id: string, tenantId: string | null) => Promise<void>;
}

/**
 * Wires a service (list/getById/create/update/remove) up to standard REST
 * controller handlers with the shared success envelope + async error
 * forwarding. Route-level validateRequest() + authenticate/authorize still
 * apply per-module — this only removes repetitive controller plumbing.
 */
export function createCrudController<T>(entityName: string, service: CrudService<T>) {
  return {
    list: asyncHandler(async (req: Request, res: Response) => {
      const { page, limit } = req.query as unknown as { page: number; limit: number };
      const result = await service.list(req.user?.tenantId ?? null, { page, limit });
      sendSuccess(res, result, `${entityName} list fetched`);
    }),

    getById: asyncHandler(async (req: Request, res: Response) => {
      const item = await service.getById(req.params.id, req.user?.tenantId ?? null);
      sendSuccess(res, { item }, `${entityName} fetched`);
    }),

    create: asyncHandler(async (req: Request, res: Response) => {
      const item = await service.create(req.body, req.user?.tenantId ?? null);
      sendSuccess(res, { item }, `${entityName} created`, 201);
    }),

    update: asyncHandler(async (req: Request, res: Response) => {
      const item = await service.update(req.params.id, req.body, req.user?.tenantId ?? null);
      sendSuccess(res, { item }, `${entityName} updated`);
    }),

    remove: asyncHandler(async (req: Request, res: Response) => {
      await service.remove(req.params.id, req.user?.tenantId ?? null);
      sendSuccess(res, null, `${entityName} deleted`);
    }),
  };
}

export function assertFound<T>(item: T | null, message: string): T {
  if (!item) {
    throw ApiError.notFound(message);
  }
  return item;
}
