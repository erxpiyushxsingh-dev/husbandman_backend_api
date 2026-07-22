import { Router } from "express";
import { authController } from "./auth.controller";
import { validateRequest } from "../../common/middlewares/validateRequest";
import { authenticate } from "../../common/middlewares/authenticate";
import { authLimiter } from "../../common/middlewares/rateLimiter";
import { changePasswordSchema, loginSchema, registerSchema } from "./auth.validators";

export const authRouter = Router();

// Stricter rate limit on every auth route — these are the prime brute-force targets.
authRouter.use(authLimiter);

authRouter.post("/register", validateRequest({ body: registerSchema }), authController.register);
authRouter.post("/login", validateRequest({ body: loginSchema }), authController.login);
authRouter.post("/refresh", authController.refresh);
authRouter.post("/logout", authController.logout);

authRouter.get("/me", authenticate, authController.me);
authRouter.post(
  "/change-password",
  authenticate,
  validateRequest({ body: changePasswordSchema }),
  authController.changePassword
);
