import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../common/middlewares/authenticate";
import { authorize } from "../../common/middlewares/authorize";
import { validateRequest } from "../../common/middlewares/validateRequest";
import { paginationQuerySchema } from "../../common/utils/pagination";
import { createBaseRepository } from "../../common/repository/baseRepository";
import { createCrudService } from "../../common/service/createCrudService";
import { createCrudController } from "../../common/controller/createCrudController";

export interface Category {
  id: string;
  name: string;
}

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
});
const updateSchema = createSchema.partial();
const idParamSchema = z.object({ id: z.string().uuid("Invalid id") });

const repository = createBaseRepository<Category>("categories");
const service = createCrudService<Category>("Category", repository);
const controller = createCrudController<Category>("Category", service);

export const categoriesRouter = Router();
categoriesRouter.use(authenticate);

categoriesRouter.get("/", validateRequest({ query: paginationQuerySchema }), controller.list);
categoriesRouter.get("/:id", validateRequest({ params: idParamSchema }), controller.getById);
categoriesRouter.post("/", validateRequest({ body: createSchema }), controller.create);
categoriesRouter.put("/:id", validateRequest({ params: idParamSchema, body: updateSchema }), controller.update);
categoriesRouter.delete("/:id", authorize("owner", "admin"), validateRequest({ params: idParamSchema }), controller.remove);
