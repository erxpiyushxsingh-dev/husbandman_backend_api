import type { Request, Response } from "express";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { sendSuccess } from "../../common/utils/ApiResponse";
import { usersService } from "./users.service";

export const usersController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const users = await usersService.list(req.user?.tenantId ?? null);
    sendSuccess(res, { users }, "Users fetched");
  }),
};
