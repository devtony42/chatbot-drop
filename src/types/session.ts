import { z } from "zod";
import type { ChatMessage } from "./provider.js";

export interface Session {
  id: string;
  tenantId?: string;
  messages: ChatMessage[];
  createdAt: number;
  lastActiveAt: number;
}

export const CreateSessionSchema = z.object({
  systemPrompt: z.string().max(4000).optional(),
});

export const SessionMessageSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(32_000),
  provider: z.enum(["openai", "anthropic", "google"]).optional(),
});
