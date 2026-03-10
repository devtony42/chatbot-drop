import { describe, it, expect, vi } from "vitest";
import { ChatService } from "../../src/services/chat-service.js";
import type { ProviderRegistry } from "../../src/services/provider-registry.js";
import type { ChatProvider, ChatResponse } from "../../src/types/index.js";

function createMockProvider(name: string): ChatProvider {
  return {
    name,
    isConfigured: () => true,
    chat: vi.fn().mockResolvedValue({
      content: `Response from ${name}`,
      provider: name,
      model: "test-model",
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    } satisfies ChatResponse),
    chatStream: vi.fn(),
  };
}

function createMockRegistry(provider: ChatProvider): ProviderRegistry {
  return {
    resolve: vi.fn().mockReturnValue(provider),
    listAvailable: vi.fn().mockReturnValue([provider.name]),
    hasProvider: vi.fn().mockReturnValue(true),
  } as unknown as ProviderRegistry;
}

describe("ChatService", () => {
  const defaultConfig = {
    systemPrompt: "Be helpful.",
    maxTokens: 512,
    temperature: 0.5,
  };

  describe("sendMessage", () => {
    it("should forward messages to the resolved provider", async () => {
      const mockProvider = createMockProvider("openai");
      const registry = createMockRegistry(mockProvider);
      const service = new ChatService(registry, defaultConfig);

      const result = await service.sendMessage([
        { role: "user", content: "Hello" },
      ]);

      expect(result.content).toBe("Response from openai");
      expect(result.provider).toBe("openai");
      expect(mockProvider.chat).toHaveBeenCalledWith({
        messages: [{ role: "user", content: "Hello" }],
        systemPrompt: "Be helpful.",
        maxTokens: 512,
        temperature: 0.5,
      });
    });

    it("should pass provider name to registry when specified", async () => {
      const mockProvider = createMockProvider("anthropic");
      const registry = createMockRegistry(mockProvider);
      const service = new ChatService(registry, defaultConfig);

      await service.sendMessage(
        [{ role: "user", content: "Hi" }],
        "anthropic",
      );

      expect(registry.resolve).toHaveBeenCalledWith("anthropic");
    });

    it("should propagate provider errors", async () => {
      const mockProvider = createMockProvider("openai");
      (mockProvider.chat as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("OpenAI API error (429): Rate limited"),
      );
      const registry = createMockRegistry(mockProvider);
      const service = new ChatService(registry, defaultConfig);

      await expect(
        service.sendMessage([{ role: "user", content: "Hello" }]),
      ).rejects.toThrow("Rate limited");
    });
  });

  describe("listProviders", () => {
    it("should return available provider names from registry", () => {
      const mockProvider = createMockProvider("openai");
      const registry = createMockRegistry(mockProvider);
      const service = new ChatService(registry, defaultConfig);

      expect(service.listProviders()).toEqual(["openai"]);
    });
  });
});
