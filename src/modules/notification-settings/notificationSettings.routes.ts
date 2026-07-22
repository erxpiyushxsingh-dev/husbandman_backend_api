import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../common/middlewares/authenticate";
import { validateRequest } from "../../common/middlewares/validateRequest";
import { paginationQuerySchema } from "../../common/utils/pagination";
import { createBaseRepository } from "../../common/repository/baseRepository";
import { createCrudService } from "../../common/service/createCrudService";
import { createCrudController } from "../../common/controller/createCrudController";

export interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

const createSchema = z.object({
  label: z.string().trim().min(1).max(150),
  description: z.string().trim().max(255).optional(),
  enabled: z.boolean().default(true),
});
const updateSchema = createSchema.partial();
const idParamSchema = z.object({ id: z.string().uuid("Invalid id") });

const repository = createBaseRepository<NotificationSetting>("notification_settings");
const service = createCrudService<NotificationSetting>("Notification setting", repository);
const controller = createCrudController<NotificationSetting>("Notification setting", service);

export const notificationSettingsRouter = Router();
notificationSettingsRouter.use(authenticate);

notificationSettingsRouter.get("/", validateRequest({ query: paginationQuerySchema }), controller.list);
notificationSettingsRouter.get("/:id", validateRequest({ params: idParamSchema }), controller.getById);
notificationSettingsRouter.post("/", validateRequest({ body: createSchema }), controller.create);
// Settings are typically just toggled — PATCH/PUT open to any authenticated user of the tenant.
notificationSettingsRouter.put("/:id", validateRequest({ params: idParamSchema, body: updateSchema }), controller.update);
notificationSettingsRouter.delete("/:id", validateRequest({ params: idParamSchema }), controller.remove);
