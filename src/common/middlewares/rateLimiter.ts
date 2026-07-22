import rateLimit from "express-rate-limit";
import { env } from "../../config/env";

/**
 * General limiter applied to the whole API — a coarse safety net against
 * abuse/DoS. Auth endpoints get a much stricter limiter on top of this to
 * blunt brute-force login/registration attempts specifically.
 */
export const generalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});

export const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only count failed attempts toward the limit
  message: { success: false, message: "Too many attempts, please try again later." },
});
