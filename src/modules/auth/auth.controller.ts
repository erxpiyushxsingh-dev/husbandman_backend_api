import type { Request, Response } from "express";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { sendSuccess } from "../../common/utils/ApiResponse";
import { ApiError } from "../../common/utils/ApiError";
import { env } from "../../config/env";
import { authService } from "./auth.service";
import ms from "../../common/utils/ms";

const REFRESH_COOKIE_NAME = "refreshToken";

const refreshCookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: "strict" as const,
  path: `${env.API_PREFIX}/auth`,
  maxAge: ms(env.JWT_REFRESH_EXPIRES_IN),
};

function requestMeta(req: Request) {
  return {
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
  };
}

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const { user } = await authService.register(req.body);
    sendSuccess(res, { user }, "Account created successfully", 201);
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const { user, tokens } = await authService.login(req.body, requestMeta(req));
    res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, refreshCookieOptions);
    sendSuccess(res, { user, accessToken: tokens.accessToken }, "Login successful");
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      throw ApiError.unauthorized("No refresh token provided");
    }
    const { tokens } = await authService.refresh(refreshToken, requestMeta(req));
    res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, refreshCookieOptions);
    sendSuccess(res, { accessToken: tokens.accessToken }, "Token refreshed");
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    res.clearCookie(REFRESH_COOKIE_NAME, { path: `${env.API_PREFIX}/auth` });
    sendSuccess(res, null, "Logged out successfully");
  }),

  changePassword: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    await authService.changePassword(req.user.sub, req.body);
    sendSuccess(res, null, "Password changed successfully");
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const user = await authService.me(req.user.sub);
    sendSuccess(res, { user }, "Current user fetched");
  }),
};
