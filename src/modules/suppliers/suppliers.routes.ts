import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../common/middlewares/authenticate";
import { authorize } from "../../common/middlewares/authorize";
import { validateRequest } from "../../common/middlewares/validateRequest";
import { paginationQuerySchema } from "../../common/utils/pagination";
import { createBaseRepository } from "../../common/repository/baseRepository";
import { createCrudService } from "../../common/service/createCrudService";
import { createCrudController } from "../../common/controller/createCrudController";

export interface Supplier {
  id: string;
  name: string;
}

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
});
const updateSchema = createSchema.partial();
const idParamSchema = z.object({ id: z.string().uuid("Invalid id") });

const repository = createBaseRepository<Supplier>("suppliers");
const service = createCrudService<Supplier>("Supplier", repository);
const controller = createCrudController<Supplier>("Supplier", service);

export const suppliersRouter = Router();
suppliersRouter.use(authenticate);

suppliersRouter.get("/", validateRequest({ query: paginationQuerySchema }), controller.list);
suppliersRouter.get("/:id", validateRequest({ params: idParamSchema }), controller.getById);
suppliersRouter.post("/", validateRequest({ body: createSchema }), controller.create);
suppliersRouter.put("/:id", validateRequest({ params: idParamSchema, body: updateSchema }), controller.update);
suppliersRouter.delete("/:id", authorize("owner", "admin"), validateRequest({ params: idParamSchema }), controller.remove);
