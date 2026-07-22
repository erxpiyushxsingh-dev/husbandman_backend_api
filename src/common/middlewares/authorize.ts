import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";

/**
 * Role-based access control. Use AFTER authenticate() in the route chain:
 *   router.delete("/:id", authenticate, authorize("owner", "admin"), controller.remove)
 */
export function authorize(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw ApiError.unauthorized("Authentication required");
    }
    if (!allowedRoles.includes(req.user.role)) {
      throw ApiError.forbidden("You do not have permission to perform this action");
    }
    next();
  };
}
