import { Router } from "express";
import { z } from "zod";
import type { ChatController } from "../controllers/chat-controller.js";
import { validate } from "../middleware/validate.js";

const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(32_000),
});

const SendMessageSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(100),
  provider: z.enum(["openai", "anthropic", "google"]).optional(),
});

/**
 * Chat API routes.
 *
 * POST /api/chat          — Send message, get full response
 * POST /api/chat/stream   — Send message, get SSE stream
 * GET  /api/chat/providers — List configured providers
 */
export function createChatRoutes(controller: ChatController): Router {
  const router = Router();

  router.post("/", validate(SendMessageSchema), controller.sendMessage);
  router.post(
    "/stream",
    validate(SendMessageSchema),
    controller.streamMessage,
  );
  router.get("/providers", controller.listProviders);

  return router;
}
