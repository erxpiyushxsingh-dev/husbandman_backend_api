import { query } from "../../config/db";
import type { UserRecord } from "./auth.types";

/**
 * All raw SQL for the auth module lives here. Every value is passed as a
 * parameter ($1, $2, ...) — never interpolated into the query string — so
 * this layer is not vulnerable to SQL injection.
 */
export const authRepository = {
  async findByEmail(email: string, tenantId?: string | null): Promise<UserRecord | null> {
    const result = await query<UserRecord>(
      `SELECT * FROM users WHERE email = $1 AND tenant_id IS NOT DISTINCT FROM $2 LIMIT 1`,
      [email, tenantId ?? null]
    );
    return result.rows[0] ?? null;
  },

  async findById(id: string): Promise<UserRecord | null> {
    const result = await query<UserRecord>(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [id]);
    return result.rows[0] ?? null;
  },

  async create(input: {
    name: string;
    email: string;
    passwordHash: string;
    role: string;
    branch?: string | null;
    tenantId?: string | null;
  }): Promise<UserRecord> {
    const result = await query<UserRecord>(
      `INSERT INTO users (name, email, password_hash, role, branch, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [input.name, input.email, input.passwordHash, input.role, input.branch ?? null, input.tenantId ?? null]
    );
    return result.rows[0];
  },

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await query(`UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2`, [
      passwordHash,
      userId,
    ]);
  },

  async recordLoginSuccess(userId: string): Promise<void> {
    await query(
      `UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = now()
       WHERE id = $1`,
      [userId]
    );
  },

  async recordLoginFailure(userId: string, attempts: number, lockedUntil: Date | null): Promise<void> {
    await query(`UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3`, [
      attempts,
      lockedUntil,
      userId,
    ]);
  },

  async storeRefreshToken(input: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<void> {
    await query(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [input.id, input.userId, input.tokenHash, input.expiresAt, input.userAgent ?? null, input.ipAddress ?? null]
    );
  },

  async findRefreshTokenById(
    id: string
  ): Promise<{ id: string; user_id: string; token_hash: string; revoked_at: string | null; expires_at: string } | null> {
    const result = await query(
      `SELECT id, user_id, token_hash, revoked_at, expires_at FROM refresh_tokens WHERE id = $1 LIMIT 1`,
      [id]
    );
    return (result.rows[0] as never) ?? null;
  },

  async revokeRefreshToken(id: string): Promise<void> {
    await query(`UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1`, [id]);
  },

  async revokeAllRefreshTokensForUser(userId: string): Promise<void> {
    await query(`UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, [
      userId,
    ]);
  },
};
