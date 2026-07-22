import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Validates and SANITIZES req.body/query/params against a Zod schema
 * before the request reaches the controller. On failure it throws a
 * ZodError, which errorHandler turns into a 400 with field-level messages.
 * Controllers can therefore trust that whatever they receive is already
 * shaped correctly — no defensive checks needed downstream.
 */
export function validateRequest(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (schemas.body) {
      req.body = schemas.body.parse(req.body);
    }
    if (schemas.query) {
      req.query = schemas.query.parse(req.query);
    }
    if (schemas.params) {
      req.params = schemas.params.parse(req.params);
    }
    next();
  };
}
