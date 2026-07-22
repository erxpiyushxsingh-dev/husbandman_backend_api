import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../common/middlewares/authenticate";
import { authorize } from "../../common/middlewares/authorize";
import { validateRequest } from "../../common/middlewares/validateRequest";
import { paginationQuerySchema } from "../../common/utils/pagination";
import { createBaseRepository } from "../../common/repository/baseRepository";
import { createCrudService } from "../../common/service/createCrudService";
import { createCrudController } from "../../common/controller/createCrudController";

export interface Branch {
  id: string;
  name: string;
  type: "branch" | "warehouse";
  employees: number;
  status: "active" | "near-capacity";
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(150),
  type: z.enum(["branch", "warehouse"]).default("branch"),
  employees: z.number().int().min(0).default(0),
  status: z.enum(["active", "near-capacity"]).default("active"),
});
const updateSchema = createSchema.partial();
const idParamSchema = z.object({ id: z.string().uuid("Invalid id") });

const repository = createBaseRepository<Branch>("branches");
const service = createCrudService<Branch>("Branch", repository);
const controller = createCrudController<Branch>("Branch", service);

export const branchesRouter = Router();
branchesRouter.use(authenticate);

branchesRouter.get("/", validateRequest({ query: paginationQuerySchema }), controller.list);
branchesRouter.get("/:id", validateRequest({ params: idParamSchema }), controller.getById);
branchesRouter.post("/", authorize("owner", "admin"), validateRequest({ body: createSchema }), controller.create);
branchesRouter.put("/:id", authorize("owner", "admin"), validateRequest({ params: idParamSchema, body: updateSchema }), controller.update);
branchesRouter.delete("/:id", authorize("owner", "admin"), validateRequest({ params: idParamSchema }), controller.remove);
