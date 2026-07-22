import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../common/middlewares/authenticate";
import { authorize } from "../../common/middlewares/authorize";
import { validateRequest } from "../../common/middlewares/validateRequest";
import { paginationQuerySchema } from "../../common/utils/pagination";
import { createBaseRepository } from "../../common/repository/baseRepository";
import { createCrudService } from "../../common/service/createCrudService";
import { createCrudController } from "../../common/controller/createCrudController";

export interface Warehouse {
  id: string;
  name: string;
  capacitySqft: number;
  utilizationPct: number;
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(150),
  capacitySqft: z.number().min(0).default(0),
  utilizationPct: z.number().min(0).max(100).default(0),
});
const updateSchema = createSchema.partial();
const idParamSchema = z.object({ id: z.string().uuid("Invalid id") });

const repository = createBaseRepository<Warehouse>("warehouses");
const service = createCrudService<Warehouse>("Warehouse", repository);
const controller = createCrudController<Warehouse>("Warehouse", service);

export const warehousesRouter = Router();
warehousesRouter.use(authenticate);

warehousesRouter.get("/", validateRequest({ query: paginationQuerySchema }), controller.list);
warehousesRouter.get("/:id", validateRequest({ params: idParamSchema }), controller.getById);
warehousesRouter.post("/", authorize("owner", "admin", "manager"), validateRequest({ body: createSchema }), controller.create);
warehousesRouter.put("/:id", authorize("owner", "admin", "manager"), validateRequest({ params: idParamSchema, body: updateSchema }), controller.update);
warehousesRouter.delete("/:id", authorize("owner", "admin"), validateRequest({ params: idParamSchema }), controller.remove);
