import type { Response } from "express";

/**
 * Every successful response in the API follows this envelope so frontend
 * clients can handle responses generically instead of guessing shapes
 * per-endpoint.
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message = "Success",
  statusCode = 200
): Response {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}
