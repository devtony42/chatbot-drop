import { Router } from "express";
import type { SessionController } from "../controllers/session-controller.js";
import { validate } from "../middleware/validate.js";
import { SessionMessageSchema } from "../types/index.js";

/**
 * Session-based chat API routes.
 *
 * POST   /api/sessions              — Create a new conversation session
 * GET    /api/sessions/:sessionId   — Get session info
 * POST   /api/sessions/message      — Send message within a session
 * POST   /api/sessions/message/stream — Stream message within a session
 * DELETE /api/sessions/:sessionId   — End a session
 */
export function createSessionRoutes(controller: SessionController): Router {
  const router = Router();

  router.post("/", controller.createSession);
  router.get("/:sessionId", controller.getSession);
  router.post("/message", validate(SessionMessageSchema), controller.sendMessage);
  router.post(
    "/message/stream",
    validate(SessionMessageSchema),
    controller.streamMessage,
  );
  router.delete("/:sessionId", controller.deleteSession);

  return router;
}
