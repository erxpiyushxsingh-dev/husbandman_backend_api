import type { NextFunction, Request, Response } from "express";

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Wraps an async controller so any rejected promise is forwarded to
 * next(err) automatically. Without this, a thrown error inside an async
 * Express handler would crash the process instead of hitting the error
 * middleware.
 */
export function asyncHandler(fn: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
