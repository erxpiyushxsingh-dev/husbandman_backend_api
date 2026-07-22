import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

/**
 * Every environment variable the app needs is declared and validated here.
 * If something required is missing or malformed, the process fails fast at
 * boot instead of surfacing a confusing error later at runtime.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  API_PREFIX: z.string().default("/api/v1"),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().default(5432),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_SSL: z.coerce.boolean().default(false),
  DB_POOL_MAX: z.coerce.number().default(10),

  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  COOKIE_SECRET: z.string().min(32, "COOKIE_SECRET must be at least 32 characters"),

  CORS_ORIGINS: z.string().default("http://localhost:5173"),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(10),

  BCRYPT_SALT_ROUNDS: z.coerce.number().default(12),

  // ---- AI assistant provider (chat feature) ----
  // AI_PROVIDER picks which of the keys below is actually used; the others
  // can stay blank. "openrouter" is OpenAI-API-compatible, just a
  // different base URL + model naming ("vendor/model").
  AI_PROVIDER: z.enum(["openrouter", "openai", "anthropic"]).default("openrouter"),
  OPENROUTER_API_KEY: z.string().optional().default(""),
  OPENROUTER_MODEL: z.string().default("openai/gpt-4o-mini"),
  OPENAI_API_KEY: z.string().optional().default(""),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  ANTHROPIC_API_KEY: z.string().optional().default(""),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-5-20250929"),
});

const parsed = envSchema
  .refine((data) => data.AI_PROVIDER !== "openrouter" || data.OPENROUTER_API_KEY.length > 0, {
    message: "OPENROUTER_API_KEY is required when AI_PROVIDER=openrouter",
    path: ["OPENROUTER_API_KEY"],
  })
  .refine((data) => data.AI_PROVIDER !== "openai" || data.OPENAI_API_KEY.length > 0, {
    message: "OPENAI_API_KEY is required when AI_PROVIDER=openai",
    path: ["OPENAI_API_KEY"],
  })
  .refine((data) => data.AI_PROVIDER !== "anthropic" || data.ANTHROPIC_API_KEY.length > 0, {
    message: "ANTHROPIC_API_KEY is required when AI_PROVIDER=anthropic",
    path: ["ANTHROPIC_API_KEY"],
  })
  .safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === "production",
  isDevelopment: parsed.data.NODE_ENV === "development",
  corsOrigins: parsed.data.CORS_ORIGINS.split(",").map((origin) => origin.trim()),
};
