import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../common/middlewares/authenticate";
import { authorize } from "../../common/middlewares/authorize";
import { validateRequest } from "../../common/middlewares/validateRequest";
import { paginationQuerySchema } from "../../common/utils/pagination";
import { createBaseRepository } from "../../common/repository/baseRepository";
import { createCrudService } from "../../common/service/createCrudService";
import { createCrudController } from "../../common/controller/createCrudController";

export interface ReportItem {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(255).optional(),
});
const updateSchema = createSchema.partial();
const idParamSchema = z.object({ id: z.string().uuid("Invalid id") });

const repository = createBaseRepository<ReportItem>("reports");
const service = createCrudService<ReportItem>("Report", repository);
const controller = createCrudController<ReportItem>("Report", service);

export const reportsRouter = Router();
reportsRouter.use(authenticate);

reportsRouter.get("/", validateRequest({ query: paginationQuerySchema }), controller.list);
reportsRouter.get("/:id", validateRequest({ params: idParamSchema }), controller.getById);
reportsRouter.post("/", authorize("owner", "admin", "manager"), validateRequest({ body: createSchema }), controller.create);
reportsRouter.put("/:id", authorize("owner", "admin", "manager"), validateRequest({ params: idParamSchema, body: updateSchema }), controller.update);
reportsRouter.delete("/:id", authorize("owner", "admin"), validateRequest({ params: idParamSchema }), controller.remove);
