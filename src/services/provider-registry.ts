import type { ChatProvider, ProviderConfig } from "../types/index.js";
import { OpenAIProvider } from "../providers/openai.js";
import { AnthropicProvider } from "../providers/anthropic.js";
import { GoogleProvider } from "../providers/google.js";

/**
 * Manages available AI providers and resolves which one to use.
 * Providers are only instantiated if their API key is configured.
 */
export class ProviderRegistry {
  private readonly providers = new Map<string, ChatProvider>();
  private readonly defaultProvider: string;

  constructor(config: ProviderConfig) {
    this.defaultProvider = config.default;

    if (config.openai) {
      this.providers.set(
        "openai",
        new OpenAIProvider(config.openai),
      );
    }

    if (config.anthropic) {
      this.providers.set(
        "anthropic",
        new AnthropicProvider(config.anthropic),
      );
    }

    if (config.google) {
      this.providers.set(
        "google",
        new GoogleProvider(config.google),
      );
    }
  }

  resolve(name?: string): ChatProvider {
    const providerName = name ?? this.defaultProvider;
    const provider = this.providers.get(providerName);

    if (!provider) {
      const available = this.listAvailable();
      throw new Error(
        `Provider "${providerName}" is not configured. Available: ${available.join(", ") || "none"}`,
      );
    }

    if (!provider.isConfigured()) {
      throw new Error(
        `Provider "${providerName}" is registered but not properly configured.`,
      );
    }

    return provider;
  }

  listAvailable(): string[] {
    return Array.from(this.providers.entries())
      .filter(([, p]) => p.isConfigured())
      .map(([name]) => name);
  }

  hasProvider(name: string): boolean {
    return this.providers.has(name) && (this.providers.get(name)?.isConfigured() ?? false);
  }
}
