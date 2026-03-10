import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import type { AppConfig } from "../../src/types/index.js";

function createTestConfig(
  overrides?: Partial<AppConfig>,
): AppConfig {
  return {
    server: {
      port: 0,
      host: "127.0.0.1",
      corsOrigins: ["*"],
      rateLimitWindowMs: 60_000,
      rateLimitMaxRequests: 100,
    },
    providers: {
      default: "openai",
      openai: { apiKey: "test-key", model: "gpt-4o-mini" },
    },
    systemPrompt: "Test system prompt.",
    maxTokens: 256,
    temperature: 0.5,
    ...overrides,
  };
}

describe("API Integration", () => {
  describe("GET /api/health", () => {
    it("should return status ok with provider list", async () => {
      const { app } = createApp(createTestConfig());

      const res = await request(app).get("/api/health");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.providers).toContain("openai");
      expect(res.body.timestamp).toBeDefined();
    });

    it("should return empty providers when none configured", async () => {
      const config = createTestConfig({
        providers: { default: "openai" },
      });
      const { app } = createApp(config);

      const res = await request(app).get("/api/health");

      expect(res.status).toBe(200);
      expect(res.body.providers).toEqual([]);
    });
  });

  describe("GET /api/chat/providers", () => {
    it("should list configured providers", async () => {
      const { app } = createApp(createTestConfig());

      const res = await request(app).get("/api/chat/providers");

      expect(res.status).toBe(200);
      expect(res.body.providers).toContain("openai");
    });
  });

  describe("POST /api/chat", () => {
    it("should reject empty messages array", async () => {
      const { app } = createApp(createTestConfig());

      const res = await request(app)
        .post("/api/chat")
        .send({ messages: [] });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation failed");
    });

    it("should reject messages with empty content", async () => {
      const { app } = createApp(createTestConfig());

      const res = await request(app)
        .post("/api/chat")
        .send({ messages: [{ role: "user", content: "" }] });

      expect(res.status).toBe(400);
    });

    it("should reject invalid role values", async () => {
      const { app } = createApp(createTestConfig());

      const res = await request(app)
        .post("/api/chat")
        .send({ messages: [{ role: "hacker", content: "hello" }] });

      expect(res.status).toBe(400);
    });

    it("should reject invalid provider names", async () => {
      const { app } = createApp(createTestConfig());

      const res = await request(app)
        .post("/api/chat")
        .send({
          messages: [{ role: "user", content: "hi" }],
          provider: "invalid-provider",
        });

      expect(res.status).toBe(400);
    });

    it("should reject request body exceeding size limit", async () => {
      const { app } = createApp(createTestConfig());
      const hugeContent = "x".repeat(200_000);

      const res = await request(app)
        .post("/api/chat")
        .send({ messages: [{ role: "user", content: hugeContent }] });

      expect(res.status).toBe(413);
    });
  });

  describe("Static files", () => {
    it("should serve the demo page", async () => {
      const { app } = createApp(createTestConfig());

      const res = await request(app).get("/");

      expect(res.status).toBe(200);
      expect(res.text).toContain("Agentic Chatbot Starter");
    });

    it("should serve the widget JS", async () => {
      const { app } = createApp(createTestConfig());

      const res = await request(app).get("/js/widget.js");

      expect(res.status).toBe(200);
      expect(res.text).toContain("acw-container");
    });

    it("should serve the widget CSS", async () => {
      const { app } = createApp(createTestConfig());

      const res = await request(app).get("/css/widget.css");

      expect(res.status).toBe(200);
      expect(res.text).toContain("acw-container");
    });
  });
});
