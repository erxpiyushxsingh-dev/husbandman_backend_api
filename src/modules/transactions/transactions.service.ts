import { withTransaction } from "../../config/db";
import { ApiError } from "../../common/utils/ApiError";
import { camelToSnake, snakeToCamel } from "../../common/utils/caseMapper";
import { computeStockStatus } from "../inventory/inventory.repository";
import { transactionsRepository } from "./transactions.repository";
import type { Transaction } from "./transactions.types";

export const transactionsService = {
  async list(tenantId: string | null, pagination: { page: number; limit: number }) {
    return transactionsRepository.list(tenantId, pagination);
  },

  async getById(id: string, tenantId: string | null): Promise<Transaction> {
    const item = await transactionsRepository.findById(id, tenantId);
    if (!item) throw ApiError.notFound("Transaction not found");
    return item;
  },

  /**
   * Creates a transaction (sale/purchase) and, if an inventoryItemId +
   * quantity are supplied, adjusts that item's stock in the SAME database
   * transaction — a sale deducts stock, a purchase adds it. If either step
   * fails (including "insufficient stock" on a sale), both are rolled back
   * so the ledger and the stock count can never drift apart.
   */
  async create(data: Record<string, unknown>, tenantId: string | null): Promise<Transaction> {
    const existing = await transactionsRepository.findByInvoiceNo(data.invoiceNo as string, tenantId);
    if (existing) {
      throw ApiError.conflict("A transaction with this invoice number already exists");
    }

    const { inventoryItemId, quantity, ...transactionData } = data as Record<string, unknown> & {
      inventoryItemId?: string;
      quantity?: number;
    };

    return withTransaction(async (client) => {
      const payload = camelToSnake(transactionData);
      const columns = Object.keys(payload);
      const values = Object.values(payload);
      const tenantIdx = values.length + 1;

      const inserted = await client.query(
        `INSERT INTO transactions (${columns.join(", ")}, tenant_id)
         VALUES (${columns.map((_, i) => `$${i + 1}`).join(", ")}, $${tenantIdx})
         RETURNING *`,
        [...values, tenantId]
      );

      if (inventoryItemId && quantity) {
        const current = await client.query(
          `SELECT * FROM inventory WHERE id = $1 AND tenant_id IS NOT DISTINCT FROM $2 FOR UPDATE`,
          [inventoryItemId, tenantId]
        );
        const invRow = current.rows[0];
        if (!invRow) {
          throw ApiError.notFound("Inventory item not found for this transaction");
        }

        const delta = transactionData.type === "sale" ? -Math.abs(quantity) : Math.abs(quantity);
        const newStock = Number(invRow.stock) + delta;
        if (newStock < 0) {
          throw ApiError.badRequest("Insufficient stock to complete this sale", {
            available: Number(invRow.stock),
            requested: Math.abs(delta),
          });
        }

        await client.query(`UPDATE inventory SET stock = $1, stock_status = $2, updated_at = now() WHERE id = $3`, [
          newStock,
          computeStockStatus(newStock),
          inventoryItemId,
        ]);
      }

      return snakeToCamel<Transaction>(inserted.rows[0] as Record<string, unknown>);
    });
  },

  async update(id: string, data: Record<string, unknown>, tenantId: string | null): Promise<Transaction> {
    const updated = await transactionsRepository.update(id, data, tenantId);
    if (!updated) throw ApiError.notFound("Transaction not found");
    return updated;
  },

  async remove(id: string, tenantId: string | null): Promise<void> {
    const deleted = await transactionsRepository.remove(id, tenantId);
    if (!deleted) throw ApiError.notFound("Transaction not found");
  },
};
