import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import type { AppConfig } from "../../src/types/index.js";

function createTestConfig(): AppConfig {
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
    systemPrompt: "Test prompt.",
    maxTokens: 256,
    temperature: 0.5,
  };
}

describe("Sessions API", () => {
  const stores: Array<{ destroy: () => void }> = [];

  function createTestApp() {
    const result = createApp(createTestConfig());
    stores.push(result.sessionStore);
    return result;
  }

  afterEach(() => {
    for (const store of stores) store.destroy();
    stores.length = 0;
  });

  describe("POST /api/sessions", () => {
    it("should create a new session and return a UUID", async () => {
      const { app } = createTestApp();

      const res = await request(app).post("/api/sessions");

      expect(res.status).toBe(201);
      expect(res.body.sessionId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(res.body.createdAt).toBeDefined();
    });
  });

  describe("GET /api/sessions/:sessionId", () => {
    it("should return session info for existing session", async () => {
      const { app } = createTestApp();

      const createRes = await request(app).post("/api/sessions");
      const { sessionId } = createRes.body;

      const res = await request(app).get(`/api/sessions/${sessionId}`);

      expect(res.status).toBe(200);
      expect(res.body.sessionId).toBe(sessionId);
      expect(res.body.messageCount).toBe(0);
    });

    it("should return 404 for unknown session", async () => {
      const { app } = createTestApp();

      const res = await request(app).get(
        "/api/sessions/00000000-0000-0000-0000-000000000000",
      );

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/sessions/message", () => {
    it("should reject message for nonexistent session", async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .post("/api/sessions/message")
        .send({
          sessionId: "00000000-0000-0000-0000-000000000000",
          message: "Hello",
        });

      expect(res.status).toBe(404);
    });

    it("should validate required fields", async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .post("/api/sessions/message")
        .send({ message: "Hello" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation failed");
    });

    it("should reject empty message content", async () => {
      const { app } = createTestApp();

      const createRes = await request(app).post("/api/sessions");

      const res = await request(app)
        .post("/api/sessions/message")
        .send({
          sessionId: createRes.body.sessionId,
          message: "",
        });

      expect(res.status).toBe(400);
    });

    it("should reject invalid provider names", async () => {
      const { app } = createTestApp();

      const createRes = await request(app).post("/api/sessions");

      const res = await request(app)
        .post("/api/sessions/message")
        .send({
          sessionId: createRes.body.sessionId,
          message: "Hello",
          provider: "fake-provider",
        });

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/sessions/:sessionId", () => {
    it("should delete an existing session", async () => {
      const { app } = createTestApp();

      const createRes = await request(app).post("/api/sessions");
      const { sessionId } = createRes.body;

      const deleteRes = await request(app).delete(
        `/api/sessions/${sessionId}`,
      );
      expect(deleteRes.status).toBe(204);

      const getRes = await request(app).get(`/api/sessions/${sessionId}`);
      expect(getRes.status).toBe(404);
    });

    it("should return 404 for unknown session", async () => {
      const { app } = createTestApp();

      const res = await request(app).delete(
        "/api/sessions/00000000-0000-0000-0000-000000000000",
      );

      expect(res.status).toBe(404);
    });
  });
});
