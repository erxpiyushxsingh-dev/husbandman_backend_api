import { Router } from "express";
import { authenticate } from "../../common/middlewares/authenticate";
import { authorize } from "../../common/middlewares/authorize";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { sendSuccess } from "../../common/utils/ApiResponse";
import { financeService } from "./finance.service";

export const financeRouter = Router();
financeRouter.use(authenticate);

financeRouter.get(
  "/summary",
  authorize("owner", "admin", "manager"),
  asyncHandler(async (req, res) => {
    const summary = await financeService.getSummary(req.user?.tenantId ?? null);
    sendSuccess(res, summary, "Finance summary fetched");
  })
);
