import type {
  ChatProvider,
  ChatRequest,
  ChatResponse,
  StreamChunk,
} from "../types/index.js";

interface OpenAIConfig {
  apiKey: string;
  model?: string;
}

/**
 * OpenAI Chat Completions provider.
 * @see https://platform.openai.com/docs/api-reference/chat
 */
export class OpenAIProvider implements ChatProvider {
  readonly name = "openai";
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl = "https://api.openai.com/v1";

  constructor(config: OpenAIConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model ?? "gpt-4o-mini";
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const messages = this.buildMessages(request);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${error}`);
    }

    const data = (await response.json()) as OpenAIChatResponse;

    return {
      content: data.choices[0]?.message?.content ?? "",
      provider: this.name,
      model: this.model,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }

  async *chatStream(
    request: ChatRequest,
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const messages = this.buildMessages(request);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${error}`);
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
        const payload = trimmed.slice(6);
        if (payload === "[DONE]") {
          yield { content: "", done: true };
          return;
        }

        const chunk = JSON.parse(payload) as OpenAIStreamChunk;
        const content = chunk.choices[0]?.delta?.content ?? "";
        if (content) {
          yield { content, done: false };
        }
      }
    }
  }

  private buildMessages(
    request: ChatRequest,
  ): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];
    if (request.systemPrompt) {
      messages.push({ role: "system", content: request.systemPrompt });
    }
    for (const msg of request.messages) {
      messages.push({ role: msg.role, content: msg.content });
    }
    return messages;
  }
}

/** @see https://platform.openai.com/docs/api-reference/chat/object */
interface OpenAIChatResponse {
  choices: Array<{
    message: { role: string; content: string };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIStreamChunk {
  choices: Array<{
    delta: { content?: string };
  }>;
}
