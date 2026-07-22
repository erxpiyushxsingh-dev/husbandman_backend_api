import express, { type Application } from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import hpp from "hpp";
import { env } from "./config/env";
import { requestLogger } from "./common/middlewares/requestLogger";
import { generalLimiter } from "./common/middlewares/rateLimiter";
import { errorHandler, notFoundHandler } from "./common/middlewares/errorHandler";
import { authRouter } from "./modules/auth/auth.routes";
import { usersRouter } from "./modules/users/users.routes";
import { categoriesRouter } from "./modules/categories/categories.routes";
import { suppliersRouter } from "./modules/suppliers/suppliers.routes";
import { branchesRouter } from "./modules/branches/branches.routes";
import { inventoryRouter } from "./modules/inventory/inventory.routes";
import { transactionsRouter } from "./modules/transactions/transactions.routes";
import { farmersRouter } from "./modules/farmers/farmers.routes";
import { employeesRouter } from "./modules/employees/employees.routes";
import { warehousesRouter } from "./modules/warehouses/warehouses.routes";
import { stockTransfersRouter } from "./modules/stock-transfers/stockTransfers.routes";
import { expensesRouter } from "./modules/expenses/expenses.routes";
import { financeRouter } from "./modules/finance/finance.routes";
import { reportsRouter } from "./modules/reports/reports.routes";
import { knowledgeDocsRouter } from "./modules/knowledge-docs/knowledgeDocs.routes";
import { aiMessagesRouter } from "./modules/ai-assistant/aiMessages.routes";
import { notificationSettingsRouter } from "./modules/notification-settings/notificationSettings.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";

export function createApp(): Application {
  const app = express();

  // Trust the first proxy (needed for correct client IPs / rate limiting
  // behind nginx, a load balancer, Render, Railway, etc.)
  app.set("trust proxy", 1);

  // ---- Security headers ----
  app.use(
    helmet({
      contentSecurityPolicy: env.isProduction ? undefined : false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  // ---- CORS: only the configured frontend origins, credentials allowed for cookies ----
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || env.corsOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // ---- Body parsing with sane size limits (mitigates large-payload DoS) ----
  app.use(express.json({ limit: "10kb" }));
  app.use(express.urlencoded({ extended: true, limit: "10kb" }));
  app.use(cookieParser(env.COOKIE_SECRET));

  // ---- HTTP Parameter Pollution protection ----
  app.use(hpp());

  // ---- Compression ----
  app.use(compression());

  // ---- Logging ----
  app.use(requestLogger);

  // ---- Global rate limiting (auth routes add a stricter limiter of their own) ----
  app.use(env.API_PREFIX, generalLimiter);

  // ---- Health check (unauthenticated, for load balancers/uptime checks) ----
  app.get("/health", (_req, res) => {
    res.status(200).json({ success: true, message: "OK", timestamp: new Date().toISOString() });
  });

  // ---- Routes ----
  app.use(`${env.API_PREFIX}/auth`, authRouter);
  app.use(`${env.API_PREFIX}/users`, usersRouter);
  app.use(`${env.API_PREFIX}/categories`, categoriesRouter);
  app.use(`${env.API_PREFIX}/suppliers`, suppliersRouter);
  app.use(`${env.API_PREFIX}/branches`, branchesRouter);
  app.use(`${env.API_PREFIX}/inventory`, inventoryRouter);
  app.use(`${env.API_PREFIX}/transactions`, transactionsRouter);
  app.use(`${env.API_PREFIX}/farmers`, farmersRouter);
  app.use(`${env.API_PREFIX}/employees`, employeesRouter);
  app.use(`${env.API_PREFIX}/warehouses`, warehousesRouter);
  app.use(`${env.API_PREFIX}/stock-transfers`, stockTransfersRouter);
  app.use(`${env.API_PREFIX}/expenses`, expensesRouter);
  app.use(`${env.API_PREFIX}/finance`, financeRouter);
  app.use(`${env.API_PREFIX}/reports`, reportsRouter);
  app.use(`${env.API_PREFIX}/knowledge-docs`, knowledgeDocsRouter);
  app.use(`${env.API_PREFIX}/ai-messages`, aiMessagesRouter);
  app.use(`${env.API_PREFIX}/notification-settings`, notificationSettingsRouter);
  app.use(`${env.API_PREFIX}/dashboard`, dashboardRouter);

  // ---- 404 + centralized error handler (must be last) ----
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
