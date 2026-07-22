import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError";
import { logger } from "../../config/logger";
import { env } from "../../config/env";

/**
 * Single place where every error in the app ends up. Keep this LAST in the
 * middleware chain (after all routes). Never leak stack traces or internal
 * details to the client in production.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof ApiError) {
    if (!err.isOperational) {
      logger.error(err.message, { stack: err.stack, path: req.path });
    }
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details ? { errors: err.details } : {}),
    });
    return;
  }

  // Unknown/unexpected error — never trust its shape or message for the client.
  const error = err as Error;
  logger.error("Unhandled error", { message: error?.message, stack: error?.stack, path: req.path });
  res.status(500).json({
    success: false,
    message: env.isProduction ? "Internal server error" : error?.message ?? "Internal server error",
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
}
