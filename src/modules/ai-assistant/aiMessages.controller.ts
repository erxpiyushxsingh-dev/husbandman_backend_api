import type { Request, Response } from "express";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { sendSuccess } from "../../common/utils/ApiResponse";
import { ApiError } from "../../common/utils/ApiError";
import { aiMessagesService } from "./aiMessages.service";

export const aiMessagesController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const items = await aiMessagesService.listConversation(req.user.sub, req.user.tenantId ?? null);
    sendSuccess(res, { items }, "Conversation fetched");
  }),

  send: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const result = await aiMessagesService.sendMessage(req.user.sub, req.user.tenantId ?? null, req.body);
    sendSuccess(res, result, "Message sent", 201);
  }),
};
