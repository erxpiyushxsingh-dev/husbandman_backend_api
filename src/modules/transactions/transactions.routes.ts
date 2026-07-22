import { Router } from "express";
import { authenticate } from "../../common/middlewares/authenticate";
import { authorize } from "../../common/middlewares/authorize";
import { validateRequest } from "../../common/middlewares/validateRequest";
import { paginationQuerySchema } from "../../common/utils/pagination";
import { transactionsController } from "./transactions.controller";
import { createTransactionSchema, idParamSchema, updateTransactionSchema } from "./transactions.validators";

export const transactionsRouter = Router();
transactionsRouter.use(authenticate);

transactionsRouter.get("/", validateRequest({ query: paginationQuerySchema }), transactionsController.list);
transactionsRouter.get("/:id", validateRequest({ params: idParamSchema }), transactionsController.getById);
transactionsRouter.post("/", validateRequest({ body: createTransactionSchema }), transactionsController.create);
transactionsRouter.put(
  "/:id",
  authorize("owner", "admin", "manager"),
  validateRequest({ params: idParamSchema, body: updateTransactionSchema }),
  transactionsController.update
);
transactionsRouter.delete("/:id", authorize("owner", "admin"), validateRequest({ params: idParamSchema }), transactionsController.remove);
