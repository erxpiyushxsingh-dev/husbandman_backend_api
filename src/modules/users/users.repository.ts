import { query } from "../../config/db";
import type { UserRecord } from "../auth/auth.types";

export const usersRepository = {
  async listByTenant(tenantId: string | null): Promise<UserRecord[]> {
    const result = await query<UserRecord>(
      `SELECT * FROM users WHERE tenant_id IS NOT DISTINCT FROM $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return result.rows;
  },
};
