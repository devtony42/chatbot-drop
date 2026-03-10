import type {
  ChatProvider,
  ChatRequest,
  ChatResponse,
  StreamChunk,
} from "../types/index.js";

interface AnthropicConfig {
  apiKey: string;
  model?: string;
}

/**
 * Anthropic Messages API provider.
 * @see https://docs.anthropic.com/en/api/messages
 */
export class AnthropicProvider implements ChatProvider {
  readonly name = "anthropic";
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl = "https://api.anthropic.com/v1";
  private readonly apiVersion = "2023-06-01";

  constructor(config: AnthropicConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model ?? "claude-sonnet-4-20250514";
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": this.apiVersion,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: request.maxTokens ?? 1024,
        system: request.systemPrompt,
        messages: request.messages.map((m) => ({
          role: m.role === "system" ? "user" : m.role,
          content: m.content,
        })),
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${error}`);
    }

    const data = (await response.json()) as AnthropicResponse;
    const textBlock = data.content.find((b) => b.type === "text");

    return {
      content: textBlock?.text ?? "",
      provider: this.name,
      model: this.model,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
    };
  }

  async *chatStream(
    request: ChatRequest,
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": this.apiVersion,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: request.maxTokens ?? 1024,
        system: request.systemPrompt,
        messages: request.messages.map((m) => ({
          role: m.role === "system" ? "user" : m.role,
          content: m.content,
        })),
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;

        const event = JSON.parse(trimmed.slice(6)) as AnthropicStreamEvent;

        if (
          event.type === "content_block_delta" &&
          event.delta?.type === "text_delta"
        ) {
          yield { content: event.delta.text, done: false };
        } else if (event.type === "message_stop") {
          yield { content: "", done: true };
          return;
        }
      }
    }
  }
}

/** @see https://docs.anthropic.com/en/api/messages */
interface AnthropicResponse {
  content: Array<{ type: string; text: string }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicStreamEvent {
  type: string;
  delta?: {
    type: string;
    text: string;
  };
}
