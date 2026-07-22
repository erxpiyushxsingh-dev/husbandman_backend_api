import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { checkDbConnection, pool } from "./config/db";

async function bootstrap(): Promise<void> {
  await checkDbConnection();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`AgriOS API listening on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`API base: http://localhost:${env.PORT}${env.API_PREFIX}`);
  });

  // ---- Graceful shutdown: finish in-flight requests, close DB pool, then exit ----
  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(async () => {
      await pool.end();
      logger.info("Server and DB pool closed");
      process.exit(0);
    });
    // Force-exit if shutdown hangs
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection", { reason });
  });
  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception", { message: error.message, stack: error.stack });
    process.exit(1);
  });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", error);
  process.exit(1);
});
