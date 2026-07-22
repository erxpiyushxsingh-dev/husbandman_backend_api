import morgan from "morgan";
import { logger } from "../../config/logger";
import { env } from "../../config/env";

/**
 * HTTP access log. Streams through morgan into winston so access logs and
 * app logs end up in the same place/format.
 */
export const requestLogger = morgan(env.isProduction ? "combined" : "dev", {
  stream: {
    write: (message: string) => logger.info(message.trim()),
  },
});
