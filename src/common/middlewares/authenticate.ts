import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { verifyAccessToken, type AccessTokenPayload } from "../utils/jwt";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

/**
 * Requires a valid "Authorization: Bearer <token>" access token. Attaches
 * the decoded claims to req.user for downstream handlers/authorize().
 * Every protected route in every future module should use this.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    throw ApiError.unauthorized("Authentication token missing");
  }

  const token = header.slice("Bearer ".length).trim();

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    throw ApiError.unauthorized("Invalid or expired token");
  }
}
