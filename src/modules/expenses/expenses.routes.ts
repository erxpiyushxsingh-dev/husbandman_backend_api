import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../common/middlewares/authenticate";
import { authorize } from "../../common/middlewares/authorize";
import { validateRequest } from "../../common/middlewares/validateRequest";
import { paginationQuerySchema } from "../../common/utils/pagination";
import { createBaseRepository } from "../../common/repository/baseRepository";
import { createCrudService } from "../../common/service/createCrudService";
import { createCrudController } from "../../common/controller/createCrudController";

export interface Expense {
  id: string;
  date: string;
  description: string;
  category: string;
  branch: string;
  amount: number;
}

const createSchema = z.object({
  date: z.string().date().optional(),
  description: z.string().trim().min(1).max(255),
  category: z.string().trim().max(100).optional(),
  branch: z.string().trim().max(150).optional(),
  amount: z.number().min(0),
});
const updateSchema = createSchema.partial();
const idParamSchema = z.object({ id: z.string().uuid("Invalid id") });

const repository = createBaseRepository<Expense>("expenses");
const service = createCrudService<Expense>("Expense", repository);
const controller = createCrudController<Expense>("Expense", service);

export const expensesRouter = Router();
expensesRouter.use(authenticate);

expensesRouter.get("/", validateRequest({ query: paginationQuerySchema }), controller.list);
expensesRouter.get("/:id", validateRequest({ params: idParamSchema }), controller.getById);
expensesRouter.post("/", authorize("owner", "admin", "manager"), validateRequest({ body: createSchema }), controller.create);
expensesRouter.put("/:id", authorize("owner", "admin", "manager"), validateRequest({ params: idParamSchema, body: updateSchema }), controller.update);
expensesRouter.delete("/:id", authorize("owner", "admin"), validateRequest({ params: idParamSchema }), controller.remove);
