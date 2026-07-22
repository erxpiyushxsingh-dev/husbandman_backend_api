import { Router } from "express";
import { authenticate } from "../../common/middlewares/authenticate";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { sendSuccess } from "../../common/utils/ApiResponse";
import { dashboardService } from "./dashboard.service";

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

dashboardRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const summary = await dashboardService.getSummary(req.user?.tenantId ?? null);
    sendSuccess(res, summary, "Dashboard summary fetched");
  })
);
