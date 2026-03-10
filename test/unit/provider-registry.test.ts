import { describe, it, expect } from "vitest";
import { ProviderRegistry } from "../../src/services/provider-registry.js";

describe("ProviderRegistry", () => {
  const baseConfig = {
    default: "openai" as const,
    openai: { apiKey: "test-key", model: "gpt-4o-mini" },
  };

  describe("resolve", () => {
    it("should return the default provider when no name is specified", () => {
      const registry = new ProviderRegistry(baseConfig);
      const provider = registry.resolve();
      expect(provider.name).toBe("openai");
    });

    it("should return a named provider when specified", () => {
      const config = {
        ...baseConfig,
        anthropic: { apiKey: "test-key", model: "claude-sonnet-4-20250514" },
      };
      const registry = new ProviderRegistry(config);
      const provider = registry.resolve("anthropic");
      expect(provider.name).toBe("anthropic");
    });

    it("should throw when requesting an unconfigured provider", () => {
      const registry = new ProviderRegistry(baseConfig);
      expect(() => registry.resolve("google")).toThrow(
        'Provider "google" is not configured',
      );
    });
  });

  describe("listAvailable", () => {
    it("should list only configured providers", () => {
      const registry = new ProviderRegistry(baseConfig);
      expect(registry.listAvailable()).toEqual(["openai"]);
    });

    it("should list multiple providers when configured", () => {
      const config = {
        default: "openai" as const,
        openai: { apiKey: "key-1" },
        anthropic: { apiKey: "key-2" },
        google: { apiKey: "key-3" },
      };
      const registry = new ProviderRegistry(config);
      const available = registry.listAvailable();
      expect(available).toContain("openai");
      expect(available).toContain("anthropic");
      expect(available).toContain("google");
      expect(available).toHaveLength(3);
    });

    it("should return empty array when no providers configured", () => {
      const config = { default: "openai" as const };
      const registry = new ProviderRegistry(config);
      expect(registry.listAvailable()).toEqual([]);
    });
  });

  describe("hasProvider", () => {
    it("should return true for configured providers", () => {
      const registry = new ProviderRegistry(baseConfig);
      expect(registry.hasProvider("openai")).toBe(true);
    });

    it("should return false for unconfigured providers", () => {
      const registry = new ProviderRegistry(baseConfig);
      expect(registry.hasProvider("google")).toBe(false);
    });
  });
});
