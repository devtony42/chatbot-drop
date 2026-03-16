import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import type { AppConfig } from "../../src/types/index.js";
import type { StreamChunk } from "../../src/types/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTestConfig(overrides?: Partial<AppConfig>): AppConfig {
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

/**
 * Parse a raw SSE response body into an array of data payloads.
 * Each "data: <json>" line yields one entry.
 */
function parseSseEvents(raw: string): StreamChunk[] {
  return raw
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => JSON.parse(line.slice("data: ".length)) as StreamChunk);
}

// ---------------------------------------------------------------------------
// Mock provider factory
// ---------------------------------------------------------------------------

/** Creates an async generator that yields the provided chunks */
async function* makeChunkGen(
  chunks: StreamChunk[],
): AsyncGenerator<StreamChunk, void, unknown> {
  for (const chunk of chunks) {
    yield chunk;
  }
}

const MOCK_CHUNKS: StreamChunk[] = [
  { content: "Hello", done: false },
  { content: " world", done: false },
  { content: "!", done: true },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Streaming endpoint integration (/api/chat/stream)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── 1. Content-Type header ───────────────────────────────────────────────

  it("should return Content-Type: text/event-stream", async () => {
    const { app, registry } = createApp(createTestConfig());

    // Mock the provider's chatStream to return controlled chunks
    const provider = registry.resolve("openai");
    vi.spyOn(provider, "chatStream").mockImplementation(() =>
      makeChunkGen(MOCK_CHUNKS),
    );

    const res = await request(app)
      .post("/api/chat/stream")
      .set("Accept", "text/event-stream")
      .send({ messages: [{ role: "user", content: "Hello" }] });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/event-stream/);
  });

  // ── 2. data: prefixed events ─────────────────────────────────────────────

  it("should send data: prefixed SSE events", async () => {
    const { app, registry } = createApp(createTestConfig());

    const provider = registry.resolve("openai");
    vi.spyOn(provider, "chatStream").mockImplementation(() =>
      makeChunkGen(MOCK_CHUNKS),
    );

    const res = await request(app)
      .post("/api/chat/stream")
      .send({ messages: [{ role: "user", content: "Hi" }] });

    expect(res.status).toBe(200);

    const lines = (res.text as string)
      .split("\n")
      .filter((l) => l.trim().length > 0);

    // Every non-empty line must start with "data: "
    for (const line of lines) {
      expect(line).toMatch(/^data: /);
    }
  });

  // ── 3. Events carry expected payloads ────────────────────────────────────

  it("should stream all chunks as JSON-encoded data events", async () => {
    const { app, registry } = createApp(createTestConfig());

    const provider = registry.resolve("openai");
    vi.spyOn(provider, "chatStream").mockImplementation(() =>
      makeChunkGen(MOCK_CHUNKS),
    );

    const res = await request(app)
      .post("/api/chat/stream")
      .send({ messages: [{ role: "user", content: "Tell me a story" }] });

    expect(res.status).toBe(200);

    const events = parseSseEvents(res.text as string);
    expect(events).toHaveLength(MOCK_CHUNKS.length);
    expect(events[0]).toMatchObject({ content: "Hello", done: false });
    expect(events[1]).toMatchObject({ content: " world", done: false });
    expect(events[2]).toMatchObject({ content: "!", done: true });
  });

  // ── 4. Stream completes (connection closes cleanly) ──────────────────────

  it("should close the connection after all chunks are sent", async () => {
    const { app, registry } = createApp(createTestConfig());

    const provider = registry.resolve("openai");
    vi.spyOn(provider, "chatStream").mockImplementation(() =>
      makeChunkGen(MOCK_CHUNKS),
    );

    const res = await request(app)
      .post("/api/chat/stream")
      .send({ messages: [{ role: "user", content: "Bye" }] });

    // supertest awaits full response — if we got here the connection closed
    expect(res.status).toBe(200);
    // Body should have content (not empty/truncated)
    expect((res.text as string).length).toBeGreaterThan(0);
  });

  // ── 5. Invalid request body → 400 before stream starts ──────────────────

  it("should return 400 for empty messages array (validation before stream)", async () => {
    const { app } = createApp(createTestConfig());

    const res = await request(app)
      .post("/api/chat/stream")
      .send({ messages: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("should return 400 for missing messages field", async () => {
    const { app } = createApp(createTestConfig());

    const res = await request(app)
      .post("/api/chat/stream")
      .send({});

    expect(res.status).toBe(400);
  });

  it("should return 400 for invalid provider name", async () => {
    const { app } = createApp(createTestConfig());

    const res = await request(app)
      .post("/api/chat/stream")
      .send({
        messages: [{ role: "user", content: "hi" }],
        provider: "not-a-real-provider",
      });

    expect(res.status).toBe(400);
  });

  // ── 6. Missing provider config → stream closes with no data events ────────
  //
  // The SSE controller sets response headers (status 200) before iterating the
  // async generator.  When the provider registry throws (no provider registered),
  // the error surfaces inside the for-await loop, headers have already been
  // flushed, and the connection closes cleanly with an empty body.

  it("should close stream with no data events when no provider is configured", async () => {
    // Config with no providers configured at all → registry.resolve throws
    const config = createTestConfig({
      providers: { default: "openai" },
    });
    const { app } = createApp(config);

    // Suppress the unhandled rejection that surfaces from the SSE loop error.
    // The error is expected here — we're testing how the stream handles it.
    const rejectionHandler = () => undefined;
    process.on("unhandledRejection", rejectionHandler);

    let res: Awaited<ReturnType<typeof request>["post"]>;
    try {
      res = await request(app)
        .post("/api/chat/stream")
        .send({ messages: [{ role: "user", content: "hi" }] });
    } finally {
      process.off("unhandledRejection", rejectionHandler);
    }

    // Headers were already sent → status is 200, but no SSE data events arrive
    expect(res!.status).toBe(200);
    const events = parseSseEvents(res!.text as string);
    expect(events).toHaveLength(0);
  });

  // ── 7. Mid-stream error → stream terminates (no crash) ──────────────────
  //
  // When the generator throws after yielding some chunks, the controller's
  // finally block ensures res.end() is called.  The client receives the
  // partial data and a cleanly closed connection.

  it("should handle a mid-stream error gracefully and close the response", async () => {
    const { app, registry } = createApp(createTestConfig());

    // Generator that yields one chunk then throws
    async function* errorMidStream(): AsyncGenerator<StreamChunk, void, unknown> {
      yield { content: "Partial", done: false };
      throw new Error("Simulated mid-stream LLM error");
    }

    const provider = registry.resolve("openai");
    vi.spyOn(provider, "chatStream").mockImplementation(errorMidStream);

    // Suppress the unhandled rejection that surfaces from the SSE loop error —
    // in production this would be logged server-side.  The client sees a clean
    // EOF and we assert on the received events.
    const rejectionHandler = () => undefined;
    process.on("unhandledRejection", rejectionHandler);

    let res: Awaited<ReturnType<typeof request>["post"]>;
    try {
      res = await request(app)
        .post("/api/chat/stream")
        .send({ messages: [{ role: "user", content: "stream error test" }] });
    } finally {
      process.off("unhandledRejection", rejectionHandler);
    }

    // Headers were already sent with the first chunk → status is 200
    expect(res!.status).toBe(200);
    // First partial chunk should have arrived before the error
    const events = parseSseEvents(res!.text as string);
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0]).toMatchObject({ content: "Partial" });
  });
});
