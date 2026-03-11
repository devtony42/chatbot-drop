import express from "express";
import cors from "cors";
import helmet from "helmet";
import type { AppConfig } from "./types/index.js";
import { ProviderRegistry } from "./services/provider-registry.js";
import { ChatService } from "./services/chat-service.js";
import { SessionStore } from "./services/session-store.js";
import { ChatController } from "./controllers/chat-controller.js";
import { SessionController } from "./controllers/session-controller.js";
import {
  createChatRoutes,
  createHealthRoutes,
  createSessionRoutes,
} from "./routes/index.js";
import { createRateLimiter } from "./middleware/rate-limiter.js";
import { errorHandler } from "./middleware/error-handler.js";

export function createApp(config: AppConfig) {
  const app = express();

  // Core middleware
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: config.server.corsOrigins }));
  app.use(express.json({ limit: "100kb" }));
  app.use(createRateLimiter(config.server));

  // Static files (widget demo)
  app.use(express.static("public"));

  // Services
  const registry = new ProviderRegistry(config.providers);
  const chatService = new ChatService(registry, {
    systemPrompt: config.systemPrompt,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
  });
  const sessionStore = new SessionStore();
  const chatController = new ChatController(chatService);
  const sessionController = new SessionController(chatService, sessionStore);

  // Routes
  app.use("/api/chat", createChatRoutes(chatController));
  app.use("/api/sessions", createSessionRoutes(sessionController));
  app.use("/api/health", createHealthRoutes(registry));

  // Error handling (must be last)
  app.use(errorHandler);

  return { app, registry, sessionStore };
}
