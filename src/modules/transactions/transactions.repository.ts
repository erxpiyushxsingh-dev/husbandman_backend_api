import { query } from "../../config/db";
import { camelToSnake, snakeToCamel } from "../../common/utils/caseMapper";
import { createBaseRepository } from "../../common/repository/baseRepository";
import type { Transaction } from "./transactions.types";

const baseRepository = createBaseRepository<Transaction>("transactions");

export const transactionsRepository = {
  list: baseRepository.list,
  findById: baseRepository.findById,
  update: baseRepository.update,
  remove: baseRepository.remove,

  async create(data: Record<string, unknown>, tenantId: string | null): Promise<Transaction> {
    const payload = camelToSnake(data);
    const columns = Object.keys(payload);
    const values = Object.values(payload);
    const tenantIdx = values.length + 1;
    const result = await query(
      `INSERT INTO transactions (${columns.join(", ")}, tenant_id)
       VALUES (${columns.map((_, i) => `$${i + 1}`).join(", ")}, $${tenantIdx})
       RETURNING *`,
      [...values, tenantId]
    );
    return snakeToCamel<Transaction>(result.rows[0] as Record<string, unknown>);
  },

  async findByInvoiceNo(invoiceNo: string, tenantId: string | null): Promise<Transaction | null> {
    const result = await query(
      `SELECT * FROM transactions WHERE invoice_no = $1 AND tenant_id IS NOT DISTINCT FROM $2 LIMIT 1`,
      [invoiceNo, tenantId]
    );
    const row = result.rows[0] as Record<string, unknown> | undefined;
    return row ? snakeToCamel<Transaction>(row) : null;
  },
};
