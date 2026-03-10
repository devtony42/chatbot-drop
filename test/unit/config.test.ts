import { describe, it, expect } from "vitest";
import { AppConfigSchema } from "../../src/types/config.js";

describe("AppConfigSchema", () => {
  it("should accept valid configuration with all providers", () => {
    const config = {
      providers: {
        default: "openai",
        openai: { apiKey: "sk-test" },
        anthropic: { apiKey: "sk-ant-test" },
        google: { apiKey: "goog-test" },
      },
    };

    const result = AppConfigSchema.parse(config);
    expect(result.server.port).toBe(3000);
    expect(result.providers.default).toBe("openai");
    expect(result.maxTokens).toBe(1024);
    expect(result.temperature).toBe(0.7);
  });

  it("should apply default values for optional fields", () => {
    const config = {
      providers: {
        openai: { apiKey: "sk-test" },
      },
    };

    const result = AppConfigSchema.parse(config);
    expect(result.server.host).toBe("0.0.0.0");
    expect(result.server.rateLimitWindowMs).toBe(60_000);
    expect(result.server.rateLimitMaxRequests).toBe(20);
    expect(result.systemPrompt).toContain("helpful assistant");
  });

  it("should reject empty API keys", () => {
    const config = {
      providers: {
        openai: { apiKey: "" },
      },
    };

    expect(() => AppConfigSchema.parse(config)).toThrow();
  });

  it("should reject invalid port numbers", () => {
    const config = {
      server: { port: 99999 },
      providers: { openai: { apiKey: "sk-test" } },
    };

    expect(() => AppConfigSchema.parse(config)).toThrow();
  });

  it("should reject temperature outside 0-2 range", () => {
    const config = {
      providers: { openai: { apiKey: "sk-test" } },
      temperature: 3.0,
    };

    expect(() => AppConfigSchema.parse(config)).toThrow();
  });

  it("should accept custom system prompt", () => {
    const config = {
      providers: { openai: { apiKey: "sk-test" } },
      systemPrompt: "You are a pirate. Respond in pirate speak.",
    };

    const result = AppConfigSchema.parse(config);
    expect(result.systemPrompt).toContain("pirate");
  });
});
