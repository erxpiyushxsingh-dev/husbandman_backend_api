import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../common/middlewares/authenticate";
import { authorize } from "../../common/middlewares/authorize";
import { validateRequest } from "../../common/middlewares/validateRequest";
import { paginationQuerySchema } from "../../common/utils/pagination";
import { createBaseRepository } from "../../common/repository/baseRepository";
import { createCrudService } from "../../common/service/createCrudService";
import { createCrudController } from "../../common/controller/createCrudController";

export interface Farmer {
  id: string;
  name: string;
  phone: string;
  location: string;
  landAcres: number;
  crop: string;
  stage: string;
  stageProgressPct: number;
  duesAmount: number;
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(150),
  phone: z.string().trim().max(20).optional(),
  location: z.string().trim().max(150).optional(),
  landAcres: z.number().min(0).default(0),
  crop: z.string().trim().max(100).optional(),
  stage: z.string().trim().max(100).optional(),
  stageProgressPct: z.number().min(0).max(100).default(0),
  duesAmount: z.number().min(0).default(0),
});
const updateSchema = createSchema.partial();
const idParamSchema = z.object({ id: z.string().uuid("Invalid id") });

const repository = createBaseRepository<Farmer>("farmers");
const service = createCrudService<Farmer>("Farmer", repository);
const controller = createCrudController<Farmer>("Farmer", service);

export const farmersRouter = Router();
farmersRouter.use(authenticate);

farmersRouter.get("/", validateRequest({ query: paginationQuerySchema }), controller.list);
farmersRouter.get("/:id", validateRequest({ params: idParamSchema }), controller.getById);
farmersRouter.post("/", validateRequest({ body: createSchema }), controller.create);
farmersRouter.put("/:id", validateRequest({ params: idParamSchema, body: updateSchema }), controller.update);
farmersRouter.delete("/:id", authorize("owner", "admin", "manager"), validateRequest({ params: idParamSchema }), controller.remove);
