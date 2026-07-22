import { query } from "../../config/db";
import { camelToSnake, snakeToCamel, rowsToCamel } from "../utils/caseMapper";

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface ListResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Generic parameterized CRUD for a single table, shared by every simple
 * "list/get/create/update/delete" module (categories, suppliers, inventory,
 * farmers, etc). ALL values are still bound as $1, $2, ... — the only thing
 * that varies per call is the table name and column names, which are never
 * taken from request input (they come from each module's own repository
 * file, written by us) — so this stays immune to SQL injection.
 *
 * Modules with real domain logic (transactions affecting stock, dashboard
 * aggregates, auth) don't use this — they get their own hand-written
 * repository, same as the auth module.
 */
export function createBaseRepository<T extends { id: string }>(table: string, tenantScoped = true) {
  return {
    async list(tenantId: string | null, { page = 1, limit = 20 }: PaginationParams = {}): Promise<ListResult<T>> {
      const safeLimit = Math.min(Math.max(limit, 1), 100);
      const safePage = Math.max(page, 1);
      const offset = (safePage - 1) * safeLimit;

      const where = tenantScoped ? `WHERE tenant_id IS NOT DISTINCT FROM $1` : "";
      const listParams = tenantScoped ? [tenantId, safeLimit, offset] : [safeLimit, offset];
      const limitIdx = tenantScoped ? 2 : 1;
      const offsetIdx = tenantScoped ? 3 : 2;

      const rows = await query(
        `SELECT * FROM ${table} ${where} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        listParams
      );

      const countParams = tenantScoped ? [tenantId] : [];
      const countResult = await query<{ count: string }>(`SELECT COUNT(*)::int AS count FROM ${table} ${where}`, countParams);

      return {
        items: rowsToCamel<T>(rows.rows as Record<string, unknown>[]),
        total: Number(countResult.rows[0]?.count ?? 0),
        page: safePage,
        limit: safeLimit,
      };
    },

    async findById(id: string, tenantId: string | null): Promise<T | null> {
      const where = tenantScoped ? `WHERE id = $1 AND tenant_id IS NOT DISTINCT FROM $2` : `WHERE id = $1`;
      const params = tenantScoped ? [id, tenantId] : [id];
      const result = await query(`SELECT * FROM ${table} ${where} LIMIT 1`, params);
      const row = result.rows[0] as Record<string, unknown> | undefined;
      return row ? snakeToCamel<T>(row) : null;
    },

    async create(data: Record<string, unknown>, tenantId: string | null): Promise<T> {
      const payload = tenantScoped ? { ...data, tenantId } : data;
      const snakeCasePayload = camelToSnake(payload);
      const columns = Object.keys(snakeCasePayload);
      const values = Object.values(snakeCasePayload);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");

      const result = await query(
        `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      return snakeToCamel<T>(result.rows[0] as Record<string, unknown>);
    },

    async update(id: string, data: Record<string, unknown>, tenantId: string | null): Promise<T | null> {
      const snakeCasePayload = camelToSnake(data);
      const columns = Object.keys(snakeCasePayload);
      if (columns.length === 0) {
        return this.findById(id, tenantId);
      }
      const values = Object.values(snakeCasePayload);
      const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(", ");
      const idIdx = values.length + 1;
      const tenantIdx = values.length + 2;
      const where = tenantScoped
        ? `WHERE id = $${idIdx} AND tenant_id IS NOT DISTINCT FROM $${tenantIdx}`
        : `WHERE id = $${idIdx}`;
      const params = tenantScoped ? [...values, id, tenantId] : [...values, id];

      const result = await query(
        `UPDATE ${table} SET ${setClause}, updated_at = now() ${where} RETURNING *`,
        params
      );
      const row = result.rows[0] as Record<string, unknown> | undefined;
      return row ? snakeToCamel<T>(row) : null;
    },

    async remove(id: string, tenantId: string | null): Promise<boolean> {
      const where = tenantScoped ? `WHERE id = $1 AND tenant_id IS NOT DISTINCT FROM $2` : `WHERE id = $1`;
      const params = tenantScoped ? [id, tenantId] : [id];
      const result = await query(`DELETE FROM ${table} ${where}`, params);
      return (result.rowCount ?? 0) > 0;
    },
  };
}
