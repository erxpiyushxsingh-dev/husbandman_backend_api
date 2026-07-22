import { query } from "../../config/db";
import type { StockTransfer } from "./stockTransfers.types";

/**
 * "from" and "to" are the API/domain field names (matching the frontend's
 * StockTransfer type) but map to from_location/to_location columns in
 * Postgres — not a mechanical camelCase<->snake_case conversion, so this
 * module has its own small repository instead of using the generic one.
 */
function toRow(item: Record<string, unknown>): StockTransfer {
  const row = item as Record<string, unknown>;
  return {
    id: row.id as string,
    transferNo: row.transfer_no as string,
    item: row.item as string,
    from: row.from_location as string,
    to: row.to_location as string,
    qty: row.qty as string,
    status: row.status as StockTransfer["status"],
  };
}

export const stockTransfersRepository = {
  async list(tenantId: string | null, { page = 1, limit = 20 }: { page?: number; limit?: number } = {}) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const offset = (safePage - 1) * safeLimit;

    const rows = await query(
      `SELECT * FROM stock_transfers WHERE tenant_id IS NOT DISTINCT FROM $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [tenantId, safeLimit, offset]
    );
    const countResult = await query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM stock_transfers WHERE tenant_id IS NOT DISTINCT FROM $1`,
      [tenantId]
    );

    return {
      items: rows.rows.map((r) => toRow(r as Record<string, unknown>)),
      total: countResult.rows[0]?.count ?? 0,
      page: safePage,
      limit: safeLimit,
    };
  },

  async findById(id: string, tenantId: string | null): Promise<StockTransfer | null> {
    const result = await query(
      `SELECT * FROM stock_transfers WHERE id = $1 AND tenant_id IS NOT DISTINCT FROM $2 LIMIT 1`,
      [id, tenantId]
    );
    const row = result.rows[0];
    return row ? toRow(row as Record<string, unknown>) : null;
  },

  async findByTransferNo(transferNo: string, tenantId: string | null): Promise<StockTransfer | null> {
    const result = await query(
      `SELECT * FROM stock_transfers WHERE transfer_no = $1 AND tenant_id IS NOT DISTINCT FROM $2 LIMIT 1`,
      [transferNo, tenantId]
    );
    const row = result.rows[0];
    return row ? toRow(row as Record<string, unknown>) : null;
  },

  async create(
    data: { transferNo: string; item: string; from: string; to: string; qty: string; status: string },
    tenantId: string | null
  ): Promise<StockTransfer> {
    const result = await query(
      `INSERT INTO stock_transfers (transfer_no, item, from_location, to_location, qty, status, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [data.transferNo, data.item, data.from, data.to, data.qty, data.status, tenantId]
    );
    return toRow(result.rows[0] as Record<string, unknown>);
  },

  async update(
    id: string,
    data: { status?: string; qty?: string },
    tenantId: string | null
  ): Promise<StockTransfer | null> {
    const columns: string[] = [];
    const values: unknown[] = [];
    if (data.status !== undefined) {
      columns.push(`status = $${columns.length + 1}`);
      values.push(data.status);
    }
    if (data.qty !== undefined) {
      columns.push(`qty = $${columns.length + 1}`);
      values.push(data.qty);
    }
    if (columns.length === 0) {
      return this.findById(id, tenantId);
    }
    const idIdx = values.length + 1;
    const tenantIdx = values.length + 2;
    const result = await query(
      `UPDATE stock_transfers SET ${columns.join(", ")}, updated_at = now()
       WHERE id = $${idIdx} AND tenant_id IS NOT DISTINCT FROM $${tenantIdx}
       RETURNING *`,
      [...values, id, tenantId]
    );
    const row = result.rows[0];
    return row ? toRow(row as Record<string, unknown>) : null;
  },

  async remove(id: string, tenantId: string | null): Promise<boolean> {
    const result = await query(`DELETE FROM stock_transfers WHERE id = $1 AND tenant_id IS NOT DISTINCT FROM $2`, [
      id,
      tenantId,
    ]);
    return (result.rowCount ?? 0) > 0;
  },
};
