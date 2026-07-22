import fs from "fs";
import path from "path";
import { pool } from "../config/db";
import { logger } from "../config/logger";

/**
 * Minimal, dependency-free migration runner. Reads .sql files from
 * ./migrations in filename order, tracks what's already been applied in a
 * schema_migrations table, and runs anything new inside a transaction.
 *
 * Usage:
 *   npm run migrate           -> apply all pending migrations
 *   npm run migrate:status    -> list applied vs pending
 */
const MIGRATIONS_DIR = path.join(__dirname, "migrations");

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

function getMigrationFiles(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const result = await pool.query<{ filename: string }>("SELECT filename FROM schema_migrations");
  return new Set(result.rows.map((r) => r.filename));
}

async function runMigrations(): Promise<void> {
  await ensureMigrationsTable();
  const files = getMigrationFiles();
  const applied = await getAppliedMigrations();
  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    logger.info("No pending migrations. Database is up to date.");
    return;
  }

  for (const file of pending) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
      logger.info(`Applied migration: ${file}`);
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error(`Failed to apply migration ${file}`, { error: (error as Error).message });
      throw error;
    } finally {
      client.release();
    }
  }
}

async function showStatus(): Promise<void> {
  await ensureMigrationsTable();
  const files = getMigrationFiles();
  const applied = await getAppliedMigrations();
  for (const file of files) {
    // eslint-disable-next-line no-console
    console.log(`${applied.has(file) ? "[applied]" : "[pending]"} ${file}`);
  }
}

async function main(): Promise<void> {
  const command = process.argv[2] ?? "up";
  try {
    if (command === "status") {
      await showStatus();
    } else if (command === "up") {
      await runMigrations();
    } else {
      logger.error(`Unknown migrate command: ${command}. Use "up" or "status".`);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  logger.error("Migration failed", { error: (error as Error).message });
  process.exit(1);
});
