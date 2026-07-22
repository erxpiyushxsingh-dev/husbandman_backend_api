import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { env } from "./env";
import { logger } from "./logger";

/**
 * Single shared connection pool for the whole app. Every query goes through
 * this module so pooling, logging, and (later) read-replica routing all
 * live in one place.
 */
export const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  max: env.DB_POOL_MAX,
  ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  // Errors on idle clients (e.g. connection dropped) must not crash the process.
  logger.error("Unexpected error on idle PostgreSQL client", { error: err.message });
});

/**
 * Run a parameterized query. ALWAYS use $1, $2, ... placeholders for values
 * — never string-concatenate user input into SQL. This is the single choke
 * point that prevents SQL injection across the whole codebase.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params as never[]);
  const duration = Date.now() - start;
  if (duration > 200) {
    logger.warn("Slow query", { text, duration, rows: result.rowCount });
  } else {
    logger.debug("Executed query", { text, duration, rows: result.rowCount });
  }
  return result;
}

/**
 * Run a set of queries inside a single transaction. The callback receives a
 * dedicated client — use it (not the pool) for every statement so they all
 * run on the same connection/transaction.
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function checkDbConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    logger.info("PostgreSQL connection verified");
  } finally {
    client.release();
  }
}
