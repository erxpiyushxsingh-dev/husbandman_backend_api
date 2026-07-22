import { Router } from "express";
import { authenticate } from "../../common/middlewares/authenticate";
import { authorize } from "../../common/middlewares/authorize";
import { usersController } from "./users.controller";

export const usersRouter = Router();

/**
 * This module exists mainly as a REFERENCE PATTERN for every CRUD module
 * you add later (products, inventory, purchases, sales, etc.):
 *   routes -> controller -> service -> repository, each layer with one job.
 * Copy this folder shape for new modules.
 */
usersRouter.get("/", authenticate, authorize("owner", "admin"), usersController.list);
