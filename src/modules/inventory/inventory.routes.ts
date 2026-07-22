import { Router } from "express";
import { authenticate } from "../../common/middlewares/authenticate";
import { authorize } from "../../common/middlewares/authorize";
import { validateRequest } from "../../common/middlewares/validateRequest";
import { paginationQuerySchema } from "../../common/utils/pagination";
import { inventoryController } from "./inventory.controller";
import { adjustStockSchema, createInventorySchema, idParamSchema, updateInventorySchema } from "./inventory.validators";

export const inventoryRouter = Router();
inventoryRouter.use(authenticate);

inventoryRouter.get("/", validateRequest({ query: paginationQuerySchema }), inventoryController.list);
inventoryRouter.get("/:id", validateRequest({ params: idParamSchema }), inventoryController.getById);
inventoryRouter.post("/", authorize("owner", "admin", "manager"), validateRequest({ body: createInventorySchema }), inventoryController.create);
inventoryRouter.put(
  "/:id",
  authorize("owner", "admin", "manager"),
  validateRequest({ params: idParamSchema, body: updateInventorySchema }),
  inventoryController.update
);
inventoryRouter.patch(
  "/:id/adjust-stock",
  authorize("owner", "admin", "manager", "staff"),
  validateRequest({ params: idParamSchema, body: adjustStockSchema }),
  inventoryController.adjustStock
);
inventoryRouter.delete("/:id", authorize("owner", "admin"), validateRequest({ params: idParamSchema }), inventoryController.remove);
