import { Router } from "express";
import { authenticate } from "../../common/middlewares/authenticate";
import { authorize } from "../../common/middlewares/authorize";
import { validateRequest } from "../../common/middlewares/validateRequest";
import { paginationQuerySchema } from "../../common/utils/pagination";
import { stockTransfersController } from "./stockTransfers.controller";
import { createStockTransferSchema, idParamSchema, updateStockTransferSchema } from "./stockTransfers.validators";

export const stockTransfersRouter = Router();
stockTransfersRouter.use(authenticate);

stockTransfersRouter.get("/", validateRequest({ query: paginationQuerySchema }), stockTransfersController.list);
stockTransfersRouter.get("/:id", validateRequest({ params: idParamSchema }), stockTransfersController.getById);
stockTransfersRouter.post(
  "/",
  authorize("owner", "admin", "manager"),
  validateRequest({ body: createStockTransferSchema }),
  stockTransfersController.create
);
stockTransfersRouter.put(
  "/:id",
  authorize("owner", "admin", "manager"),
  validateRequest({ params: idParamSchema, body: updateStockTransferSchema }),
  stockTransfersController.update
);
stockTransfersRouter.delete(
  "/:id",
  authorize("owner", "admin"),
  validateRequest({ params: idParamSchema }),
  stockTransfersController.remove
);
