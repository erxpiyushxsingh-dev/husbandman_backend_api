import { Router } from "express";
import { authenticate } from "../../common/middlewares/authenticate";
import { validateRequest } from "../../common/middlewares/validateRequest";
import { aiMessagesController } from "./aiMessages.controller";
import { sendMessageSchema } from "./aiMessages.validators";

export const aiMessagesRouter = Router();
aiMessagesRouter.use(authenticate);

aiMessagesRouter.get("/", aiMessagesController.list);
aiMessagesRouter.post("/", validateRequest({ body: sendMessageSchema }), aiMessagesController.send);
