import { query } from "../../config/db";
import { snakeToCamel } from "../../common/utils/caseMapper";
import type { AiMessage } from "./aiMessages.types";

function toApi(row: Record<string, unknown>): AiMessage {
  const camel = snakeToCamel<Record<string, unknown>>(row);
  return {
    id: camel.id as string,
    sender: camel.sender as AiMessage["sender"],
    text: camel.text as string,
    time: (camel.createdAt as string) ?? (camel.time as string),
    lang: camel.lang as AiMessage["lang"] | undefined,
  };
}

export const aiMessagesRepository = {
  async listForUser(userId: string, tenantId: string | null, limit = 50): Promise<AiMessage[]> {
    const result = await query(
      `SELECT * FROM ai_messages
       WHERE user_id = $1 AND tenant_id IS NOT DISTINCT FROM $2
       ORDER BY created_at ASC
       LIMIT $3`,
      [userId, tenantId, limit]
    );
    return result.rows.map((r) => toApi(r as Record<string, unknown>));
  },

  async insert(
    input: { userId: string; tenantId: string | null; sender: "user" | "bot"; text: string; lang?: string }
  ): Promise<AiMessage> {
    const result = await query(
      `INSERT INTO ai_messages (user_id, tenant_id, sender, text, lang)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [input.userId, input.tenantId, input.sender, input.text, input.lang ?? null]
    );
    return toApi(result.rows[0] as Record<string, unknown>);
  },
};
