import { query, withTransaction } from "../../config/db";
import { camelToSnake, snakeToCamel } from "../../common/utils/caseMapper";
import { createBaseRepository } from "../../common/repository/baseRepository";
import { ApiError } from "../../common/utils/ApiError";
import type { InventoryItem, StockStatus } from "./inventory.types";

const LOW_STOCK_THRESHOLD = 10;
const MEDIUM_STOCK_THRESHOLD = 50;

export function computeStockStatus(stock: number): StockStatus {
  if (stock <= 0) return "out";
  if (stock < LOW_STOCK_THRESHOLD) return "low";
  if (stock < MEDIUM_STOCK_THRESHOLD) return "medium";
  return "healthy";
}

const baseRepository = createBaseRepository<InventoryItem>("inventory");

export const inventoryRepository = {
  list: baseRepository.list,
  findById: baseRepository.findById,

  async create(data: Record<string, unknown>, tenantId: string | null): Promise<InventoryItem> {
    const stock = Number(data.stock ?? 0);
    return baseRepository.create({ ...data, stockStatus: computeStockStatus(stock) }, tenantId);
  },

  async update(id: string, data: Record<string, unknown>, tenantId: string | null): Promise<InventoryItem | null> {
    const payload = { ...data };
    if (payload.stock !== undefined) {
      payload.stockStatus = computeStockStatus(Number(payload.stock));
    }
    return baseRepository.update(id, payload, tenantId);
  },

  async remove(id: string, tenantId: string | null): Promise<boolean> {
    return baseRepository.remove(id, tenantId);
  },

  /**
   * Atomically adjusts stock by `delta` (positive or negative) and
   * recomputes stock_status in the same transaction, using SELECT ... FOR
   * UPDATE to avoid a race where two concurrent sales both read the same
   * starting stock and oversell.
   */
  async adjustStock(id: string, tenantId: string | null, delta: number): Promise<InventoryItem> {
    return withTransaction(async (client) => {
      const current = await client.query(
        `SELECT * FROM inventory WHERE id = $1 AND tenant_id IS NOT DISTINCT FROM $2 FOR UPDATE`,
        [id, tenantId]
      );
      const row = current.rows[0];
      if (!row) {
        throw ApiError.notFound("Inventory item not found");
      }

      const newStock = Number(row.stock) + delta;
      if (newStock < 0) {
        throw ApiError.badRequest("Insufficient stock for this operation", {
          available: Number(row.stock),
          requested: Math.abs(delta),
        });
      }

      const status = computeStockStatus(newStock);
      const result = await client.query(
        `UPDATE inventory SET stock = $1, stock_status = $2, updated_at = now() WHERE id = $3 RETURNING *`,
        [newStock, status, id]
      );
      return snakeToCamel<InventoryItem>(result.rows[0] as Record<string, unknown>);
    });
  },

  async findBySku(sku: string, tenantId: string | null): Promise<InventoryItem | null> {
    const result = await query(
      `SELECT * FROM inventory WHERE sku = $1 AND tenant_id IS NOT DISTINCT FROM $2 LIMIT 1`,
      [sku, tenantId]
    );
    const row = result.rows[0] as Record<string, unknown> | undefined;
    return row ? snakeToCamel<InventoryItem>(row) : null;
  },
};

// exported for modules (e.g. transactions) that need to build raw payloads consistently
export { camelToSnake };
