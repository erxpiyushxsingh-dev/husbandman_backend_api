import OpenAI from "openai";
import { env } from "../../config/env";
import { logger } from "../../config/logger";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are Agri AI, the assistant embedded inside AgriOS — a business
management platform for agri-retail dealers (fertilizer, seed, and pesticide shops) and
the farmers/suppliers they work with.

Respond in English only for now (Hindi support is coming later — do not switch languages
even if asked, just say Hindi support is coming soon).

Be concise and practical. You do NOT have live access to this user's actual inventory,
sales, or farmer records unless they paste the numbers into the chat — never invent
specific figures (stock counts, prices, revenue, dues) on their behalf. If asked for
numbers you don't have, say so and suggest where in AgriOS they can check (Inventory,
Finance, Reports, etc). You can help with general agri-business advice, explaining
AgriOS features, drafting messages, doing math the user gives you, and similar tasks.`;

let openRouterClient: OpenAI | null = null;
let openAiClient: OpenAI | null = null;

function getOpenRouterClient(): OpenAI {
  if (!openRouterClient) {
    openRouterClient = new OpenAI({
      apiKey: env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        // Recommended by OpenRouter for routing/analytics — harmless if ignored.
        "HTTP-Referer": "https://agrios.app",
        "X-Title": "AgriOS",
      },
    });
  }
  return openRouterClient;
}

function getOpenAiClient(): OpenAI {
  if (!openAiClient) {
    openAiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return openAiClient;
}

async function callOpenAiCompatible(client: OpenAI, model: string, history: ChatTurn[]): Promise<string> {
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map((turn) => ({ role: turn.role, content: turn.content })),
    ],
    temperature: 0.4,
    max_tokens: 800,
  });
  return completion.choices[0]?.message?.content?.trim() ?? "Sorry, I couldn't generate a response.";
}

async function callAnthropic(history: ChatTurn[]): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: history.map((turn) => ({ role: turn.role, content: turn.content })),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
  const textBlock = data.content?.find((block) => block.type === "text");
  return textBlock?.text?.trim() ?? "Sorry, I couldn't generate a response.";
}

/**
 * Single entry point the rest of the app calls — swaps providers based on
 * AI_PROVIDER without any caller needing to know which one is active.
 * Throws on failure; the caller (aiMessages.service.ts) decides how to
 * degrade gracefully.
 */
export async function generateAiReply(history: ChatTurn[]): Promise<string> {
  switch (env.AI_PROVIDER) {
    case "openrouter":
      return callOpenAiCompatible(getOpenRouterClient(), env.OPENROUTER_MODEL, history);
    case "openai":
      return callOpenAiCompatible(getOpenAiClient(), env.OPENAI_MODEL, history);
    case "anthropic":
      return callAnthropic(history);
    default: {
      logger.error(`Unknown AI_PROVIDER: ${env.AI_PROVIDER}`);
      throw new Error("No AI provider configured");
    }
  }
}
