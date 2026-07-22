import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../common/middlewares/authenticate";
import { authorize } from "../../common/middlewares/authorize";
import { validateRequest } from "../../common/middlewares/validateRequest";
import { paginationQuerySchema } from "../../common/utils/pagination";
import { createBaseRepository } from "../../common/repository/baseRepository";
import { createCrudService } from "../../common/service/createCrudService";
import { createCrudController } from "../../common/controller/createCrudController";
import { attendanceRouter } from "./attendance.routes";

export interface Employee {
  id: string;
  name: string;
  role: string;
  roleGroup: string;
  branch: string;
  attendance30d: number;
  status: "present" | "late" | "absent";
  openTasks: number;
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(150),
  role: z.string().trim().max(100).optional(),
  roleGroup: z.string().trim().max(100).optional(),
  branch: z.string().trim().max(150).optional(),
  attendance30d: z.number().min(0).max(100).default(0),
  status: z.enum(["present", "late", "absent"]).default("present"),
  openTasks: z.number().int().min(0).default(0),
});
const updateSchema = createSchema.partial();
const idParamSchema = z.object({ id: z.string().uuid("Invalid id") });

const repository = createBaseRepository<Employee>("employees");
const service = createCrudService<Employee>("Employee", repository);
const controller = createCrudController<Employee>("Employee", service);

export const employeesRouter = Router();
employeesRouter.use(authenticate);

employeesRouter.get("/", validateRequest({ query: paginationQuerySchema }), controller.list);
employeesRouter.get("/:id", validateRequest({ params: idParamSchema }), controller.getById);
employeesRouter.post("/", authorize("owner", "admin", "manager"), validateRequest({ body: createSchema }), controller.create);
employeesRouter.put("/:id", authorize("owner", "admin", "manager"), validateRequest({ params: idParamSchema, body: updateSchema }), controller.update);
employeesRouter.delete("/:id", authorize("owner", "admin"), validateRequest({ params: idParamSchema }), controller.remove);

// Nested resource: /employees/:employeeId/attendance
employeesRouter.use("/:employeeId/attendance", attendanceRouter);
