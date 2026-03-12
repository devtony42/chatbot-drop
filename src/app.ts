import express from "express";
import cors from "cors";
import helmet from "helmet";
import type { AppConfig } from "./types/index.js";
import { ProviderRegistry } from "./services/provider-registry.js";
import { ChatService } from "./services/chat-service.js";
import { SessionStore } from "./services/session-store.js";
import { TenantStore } from "./services/tenant-store.js";
import { ChatController } from "./controllers/chat-controller.js";
import { SessionController } from "./controllers/session-controller.js";
import {
  createChatRoutes,
  createHealthRoutes,
  createSessionRoutes,
  createTenantRoutes,
} from "./routes/index.js";
import { createRateLimiter } from "./middleware/rate-limiter.js";
import { createTenantAuth } from "./middleware/tenant-auth.js";
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
  const tenantStore = new TenantStore();
  const chatController = new ChatController(chatService);
  const sessionController = new SessionController(
    chatService,
    sessionStore,
    tenantStore,
  );

  // Tenant auth middleware for session routes
  const tenantAuth = createTenantAuth(tenantStore);

  // Routes
  app.use("/api/chat", createChatRoutes(chatController));
  app.use("/api/sessions", tenantAuth, createSessionRoutes(sessionController));
  app.use("/api/health", createHealthRoutes(registry));

  // Tenant admin routes (only mounted when ADMIN_API_KEY is configured)
  if (config.server.adminApiKey) {
    app.use(
      "/api/tenants",
      createTenantRoutes(tenantStore, config.server.adminApiKey),
    );
  }

  // Error handling (must be last)
  app.use(errorHandler);

  return { app, registry, sessionStore, tenantStore };
}
