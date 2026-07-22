import winston from "winston";
import { env } from "./env";

/**
 * Centralized structured logger. In production this emits JSON (easy to
 * ship to a log aggregator); in development it prints readable colored
 * lines. Never log secrets, passwords, or full tokens through this logger.
 */
export const logger = winston.createLogger({
  level: env.isProduction ? "info" : "debug",
  format: env.isProduction
    ? winston.format.combine(winston.format.timestamp(), winston.format.json())
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: "HH:mm:ss" }),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
          return `[${timestamp}] ${level}: ${message}${metaStr}`;
        })
      ),
  transports: [new winston.transports.Console()],
});
