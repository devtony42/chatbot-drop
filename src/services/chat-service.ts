import type { ChatMessage, ChatResponse, StreamChunk } from "../types/index.js";
import type { ProviderRegistry } from "./provider-registry.js";

interface ChatServiceConfig {
  systemPrompt: string;
  maxTokens: number;
  temperature: number;
}

export interface ChatOverrides {
  systemPrompt?: string;
  provider?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Orchestrates chat interactions between clients and AI providers.
 * Manages conversation context and delegates to the appropriate provider.
 */
export class ChatService {
  private readonly registry: ProviderRegistry;
  private readonly config: ChatServiceConfig;

  constructor(registry: ProviderRegistry, config: ChatServiceConfig) {
    this.registry = registry;
    this.config = config;
  }

  async sendMessage(
    messages: ChatMessage[],
    providerName?: string,
    overrides?: ChatOverrides,
  ): Promise<ChatResponse> {
    const provider = this.registry.resolve(overrides?.provider ?? providerName);

    return provider.chat({
      messages,
      systemPrompt: overrides?.systemPrompt ?? this.config.systemPrompt,
      maxTokens: overrides?.maxTokens ?? this.config.maxTokens,
      temperature: overrides?.temperature ?? this.config.temperature,
    });
  }

  async *streamMessage(
    messages: ChatMessage[],
    providerName?: string,
    overrides?: ChatOverrides,
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const provider = this.registry.resolve(overrides?.provider ?? providerName);

    yield* provider.chatStream({
      messages,
      systemPrompt: overrides?.systemPrompt ?? this.config.systemPrompt,
      maxTokens: overrides?.maxTokens ?? this.config.maxTokens,
      temperature: overrides?.temperature ?? this.config.temperature,
    });
  }

  listProviders(): string[] {
    return this.registry.listAvailable();
  }
}
