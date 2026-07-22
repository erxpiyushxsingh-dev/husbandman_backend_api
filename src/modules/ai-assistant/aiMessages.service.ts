import { logger } from "../../config/logger";
import { aiMessagesRepository } from "./aiMessages.repository";
import { generateAiReply, type ChatTurn } from "./aiProvider";
import type { AiMessage } from "./aiMessages.types";

const HISTORY_LIMIT = 20; // last N messages (user+bot) sent as context

export const aiMessagesService = {
  async listConversation(userId: string, tenantId: string | null): Promise<AiMessage[]> {
    return aiMessagesRepository.listForUser(userId, tenantId);
  },

  async sendMessage(
    userId: string,
    tenantId: string | null,
    input: { text: string; lang?: "hi" }
  ): Promise<{ userMessage: AiMessage; botMessage: AiMessage }> {
    const userMessage = await aiMessagesRepository.insert({
      userId,
      tenantId,
      sender: "user",
      text: input.text,
      lang: input.lang,
    });

    // Pull recent history (including the message we just inserted) so the
    // model has conversational context instead of answering in isolation.
    const recentMessages = await aiMessagesRepository.listForUser(userId, tenantId, HISTORY_LIMIT);
    const history: ChatTurn[] = recentMessages.map((m) => ({
      role: m.sender === "user" ? "user" : "assistant",
      content: m.text,
    }));

    let replyText: string;
    try {
      replyText = await generateAiReply(history);
    } catch (error) {
      logger.error("AI provider call failed", { error: (error as Error).message });
      replyText =
        "Sorry, I'm having trouble reaching the AI service right now. Please try again in a moment.";
    }

    const botMessage = await aiMessagesRepository.insert({
      userId,
      tenantId,
      sender: "bot",
      text: replyText,
      lang: input.lang,
    });

    return { userMessage, botMessage };
  },
};
